import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { CommonModule } from './common/common.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RbacModule } from './rbac/rbac.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CommonModule,
    AuditModule,
    AuthModule,
    RbacModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
