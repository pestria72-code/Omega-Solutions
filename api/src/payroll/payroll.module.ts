import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
 imports:[DatabaseModule,MembershipsModule,AuthModule,RbacModule],
 controllers:[PayrollController],
 providers:[PayrollService],
})
export class PayrollModule {}
