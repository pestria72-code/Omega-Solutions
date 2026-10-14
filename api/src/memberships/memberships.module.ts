import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
