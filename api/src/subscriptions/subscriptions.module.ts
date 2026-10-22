import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { PaystackPaymentsService } from './paystack-payments.service.js';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PaystackPaymentsService],
  exports: [SubscriptionsService, PaystackPaymentsService],
})
export class SubscriptionsModule {}
