import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { ProductImageStorageService } from './product-image-storage.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccountingModule } from '../accounting/accounting.module.js';

@Module({
  imports: [DatabaseModule, MembershipsModule, AuditModule, RbacModule, AuthModule, AccountingModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductImageStorageService],
})
export class ProductsModule {}
