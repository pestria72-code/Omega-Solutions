import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccountingModule } from '../accounting/accounting.module.js';
@Module({imports:[DatabaseModule,MembershipsModule,AuditModule,RbacModule,AuthModule,AccountingModule],controllers:[PurchaseOrdersController],providers:[PurchaseOrdersService]})
export class PurchaseOrdersModule {}
