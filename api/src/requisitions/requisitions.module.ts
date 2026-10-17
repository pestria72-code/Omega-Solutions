import { Module } from '@nestjs/common';
import { RequisitionsController } from './requisitions.controller.js';
import { RequisitionsService } from './requisitions.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({ imports:[DatabaseModule,MembershipsModule,AuditModule,RbacModule,AuthModule], controllers:[RequisitionsController], providers:[RequisitionsService] })
export class RequisitionsModule {}
