import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccountingModule } from '../accounting/accounting.module.js';

@Module({imports:[DatabaseModule,MembershipsModule,AuditModule,RbacModule,AuthModule,AccountingModule],controllers:[ExpensesController],providers:[ExpensesService]})
export class ExpensesModule {}
