import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsNumber, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MpesaService } from './mpesa.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

class StkPushDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  @MaxLength(32)
  phoneNumber!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000000)
  amount!: number;
}

@Controller('mpesa')
export class MpesaController {
  constructor(private readonly mpesa: MpesaService) {}

  @Post('stk-push')
  @RequireModule('sales')
  @UseGuards(JwtAuthGuard, PermissionsGuard, ModuleEntitlementsGuard)
  @RequirePermissions('payments:write')
  initiate(@Req() req: { user: AuthenticatedUser }, @Body() dto: StkPushDto) {
    return this.mpesa.initiate(req.user, dto.invoiceId, dto.phoneNumber, dto.amount);
  }

  @Get('stk-push/:id')
  @RequireModule('sales')
  @UseGuards(JwtAuthGuard, PermissionsGuard, ModuleEntitlementsGuard)
  @RequirePermissions('payments:read')
  status(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.mpesa.getStatus(req.user, id);
  }

  @Post('callback')
  callback(@Body() payload: Record<string, unknown>) {
    return this.mpesa.handleCallback(payload);
  }
}
