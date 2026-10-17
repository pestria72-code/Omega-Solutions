import { Module } from '@nestjs/common';
import { CreditNotesController } from './credit-notes.controller.js';
import { CreditNotesService } from './credit-notes.service.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccountingModule } from '../accounting/accounting.module.js';

@Module({
  imports: [MembershipsModule, AuditModule, RbacModule, AuthModule, AccountingModule],
  controllers: [CreditNotesController],
  providers: [CreditNotesService],
})
export class CreditNotesModule {}
