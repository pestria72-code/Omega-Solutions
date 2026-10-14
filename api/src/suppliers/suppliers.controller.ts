import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers:read')
  async list(
    @Request() req: { user: AuthenticatedUser },
    @Query('search') search?: string,
  ) {
    return this.suppliers.list(req.user, search);
  }

  @Get(':supplierId')
  @RequirePermissions('suppliers:read')
  async getById(
    @Request() req: { user: AuthenticatedUser },
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
  ) {
    return this.suppliers.getById(req.user, supplierId);
  }

  @Post()
  @RequirePermissions('suppliers:write')
  async create(
    @Request() req: { user: AuthenticatedUser },
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliers.create(req.user, dto);
  }

  @Patch(':supplierId')
  @RequirePermissions('suppliers:write')
  async update(
    @Request() req: { user: AuthenticatedUser },
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(req.user, supplierId, dto);
  }

  @Delete(':supplierId')
  @RequirePermissions('suppliers:write')
  async delete(
    @Request() req: { user: AuthenticatedUser },
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
  ) {
    await this.suppliers.delete(req.user, supplierId);
    return { success: true };
  }
}
