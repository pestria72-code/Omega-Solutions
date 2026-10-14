import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller.js';
import { SuppliersService } from './suppliers.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DatabaseModule, MembershipsModule, RbacModule, AuthModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
