import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller.js';
import { ApprovalsService } from './approvals.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({imports:[DatabaseModule,MembershipsModule,AuditModule,RbacModule,AuthModule],controllers:[ApprovalsController],providers:[ApprovalsService]})
export class ApprovalsModule {}
