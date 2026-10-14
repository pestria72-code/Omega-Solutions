import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
