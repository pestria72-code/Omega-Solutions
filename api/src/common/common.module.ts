import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { DatabaseModule } from '../database/database.module.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [],
})
export class CommonModule {}
