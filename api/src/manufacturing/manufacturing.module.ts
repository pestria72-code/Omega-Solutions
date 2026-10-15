import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { ManufacturingController } from './manufacturing.controller.js';
import { ManufacturingService } from './manufacturing.service.js';

@Module({imports:[DatabaseModule,MembershipsModule,AuditModule,AuthModule,RbacModule],controllers:[ManufacturingController],providers:[ManufacturingService],exports:[ManufacturingService]})
export class ManufacturingModule {}
