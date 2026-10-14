import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [DatabaseModule, MembershipsModule, AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
