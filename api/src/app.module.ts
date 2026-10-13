import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthGuard } from './auth/auth.guard.js';
import { CompaniesController } from './companies/companies.controller.js';
import { CompaniesService } from './companies/companies.service.js';
import { DatabaseService } from './database.service.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, CompaniesController],
  providers: [AppService, AuthGuard, CompaniesService, DatabaseService],
})
export class AppModule {}
