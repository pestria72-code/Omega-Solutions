import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { ProductRow } from './product.types.js';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

const PRODUCT_COLUMNS = `
  id, company_id, sku, name, description, category, unit,
  selling_price, cost_price, stock_quantity, reorder_level,
  is_service, is_active, created_at, updated_at
`;

@Injectable()
export class ProductsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly memberships: MembershipsService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthenticatedUser, search?: string): Promise<ProductRow[]> {
    const membership = await this.memberships.getMembership(user.userId);

    if (search) {
      const result = await this.db.query<ProductRow>(
        `SELECT ${PRODUCT_COLUMNS} FROM products
         WHERE company_id = $1 AND (name ILIKE $2 OR sku ILIKE $2 OR category ILIKE $2)
         ORDER BY created_at DESC`,
        [membership.companyId, `%${search}%`],
      );
      return result.rows;
    }

    const result = await this.db.query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products
       WHERE company_id = $1 ORDER BY created_at DESC`,
      [membership.companyId],
    );
    return result.rows;
  }

  async getById(user: AuthenticatedUser, productId: string): Promise<ProductRow> {
    const membership = await this.memberships.getMembership(user.userId);
    return this.getByIdInternal(membership.companyId, productId);
  }

  async create(user: AuthenticatedUser, dto: CreateProductDto): Promise<ProductRow> {
    const membership = await this.memberships.getMembership(user.userId);

    const existing = await this.db.query<{ id: string }>(
      'SELECT id FROM products WHERE company_id = $1 AND sku = $2',
      [membership.companyId, dto.sku],
    );
    if (existing.rows.length > 0) {
      throw new ConflictException('A product with this SKU already exists.');
    }

    const result = await this.db.query<ProductRow>(
      `INSERT INTO products
        (company_id, sku, name, description, category, unit,
         selling_price, cost_price, stock_quantity, reorder_level,
         is_service, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${PRODUCT_COLUMNS}`,
      [
        membership.companyId,
        dto.sku,
        dto.name,
        dto.description ?? null,
        dto.category ?? null,
        dto.unit ?? 'pcs',
        dto.sellingPrice,
        dto.costPrice ?? 0,
        dto.stockQuantity ?? 0,
        dto.reorderLevel ?? 0,
        dto.isService ?? false,
        dto.isActive ?? true,
      ],
    );

    const product = result.rows[0];

    await this.audit.log({
      userId: user.userId,
      companyId: membership.companyId,
      branchId: null,
      action: 'product.create',
      entityType: 'product',
      entityId: product.id,
      oldValues: null,
      newValues: { name: dto.name, sku: dto.sku },
      ipAddress: null,
    });

    return product;
  }

  async update(
    user: AuthenticatedUser,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductRow> {
    const membership = await this.memberships.getMembership(user.userId);
    const existing = await this.getByIdInternal(membership.companyId, productId);

    if (dto.stockQuantity !== undefined && Number(dto.stockQuantity) !== Number(existing.stock_quantity)) {
      throw new BadRequestException('Use Inventory > Stock Movements to change stock quantities so the stock ledger remains accurate.');
    }

    if (dto.sku && dto.sku !== existing.sku) {
      const dup = await this.db.query<{ id: string }>(
        'SELECT id FROM products WHERE company_id = $1 AND sku = $2 AND id != $3',
        [membership.companyId, dto.sku, productId],
      );
      if (dup.rows.length > 0) {
        throw new ConflictException('A product with this SKU already exists.');
      }
    }

    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      sku: 'sku',
      name: 'name',
      description: 'description',
      category: 'category',
      unit: 'unit',
      sellingPrice: 'selling_price',
      costPrice: 'cost_price',
      reorderLevel: 'reorder_level',
      isService: 'is_service',
      isActive: 'is_active',
    };

    for (const [dtoKey, dbColumn] of Object.entries(fieldMap)) {
      if (dtoKey in dto) {
        const value = (dto as Record<string, unknown>)[dtoKey];
        fields.push(`${dbColumn} = $${paramIndex}`);
        values.push(value as string | number | boolean | null);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(productId);
    values.push(membership.companyId);

    const result = await this.db.query<ProductRow>(
      `UPDATE products SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
       RETURNING ${PRODUCT_COLUMNS}`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Product not found.');
    }

    const updated = result.rows[0];

    await this.audit.log({
      userId: user.userId,
      companyId: membership.companyId,
      branchId: null,
      action: 'product.update',
      entityType: 'product',
      entityId: updated.id,
      oldValues: { name: existing.name },
      newValues: { name: updated.name },
      ipAddress: null,
    });

    return updated;
  }

  async delete(user: AuthenticatedUser, productId: string): Promise<void> {
    const membership = await this.memberships.getMembership(user.userId);
    const existing = await this.getByIdInternal(membership.companyId, productId);

    await this.db.query(
      'DELETE FROM products WHERE id = $1 AND company_id = $2',
      [productId, membership.companyId],
    );

    await this.audit.log({
      userId: user.userId,
      companyId: membership.companyId,
      branchId: null,
      action: 'product.delete',
      entityType: 'product',
      entityId: existing.id,
      oldValues: { name: existing.name },
      newValues: null,
      ipAddress: null,
    });
  }

  private async getByIdInternal(companyId: string, productId: string): Promise<ProductRow> {
    const result = await this.db.query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1 AND company_id = $2`,
      [productId, companyId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Product not found.');
    }
    return result.rows[0];
  }
}
