import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';
import { PayrollRemittancesService } from './payroll-remittances.service.js';

@Controller('payroll/remittances')
@RequireModule('hr_workforce')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleEntitlementsGuard)
export class PayrollRemittancesController {
  constructor(private readonly remittances: PayrollRemittancesService) {}

  @Get()
  @RequirePermissions('payroll:read')
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.remittances.list(req.user);
  }

  @Get('preview/:runId')
  @RequirePermissions('payroll:read')
  previewForRun(
    @Req() req: { user: AuthenticatedUser },
    @Param('runId', ParseUUIDPipe) runId: string,
  ) {
    return this.remittances.previewForRun(req.user, runId);
  }

  @Post('from-run/:runId')
  @RequirePermissions('payroll:write')
  generateForRun(
    @Req() req: { user: AuthenticatedUser },
    @Param('runId', ParseUUIDPipe) runId: string,
  ) {
    return this.remittances.generateForRun(req.user, runId);
  }

  @Post(':obligationId/payments')
  @RequirePermissions('payroll:write')
  recordPayment(
    @Req() req: { user: AuthenticatedUser },
    @Param('obligationId', ParseUUIDPipe) obligationId: string,
    @Body() dto: {
      amount?: unknown;
      paymentReference?: unknown;
      paidAt?: unknown;
      receiptStorageKey?: unknown;
      notes?: unknown;
    },
  ) {
    return this.remittances.recordPayment(req.user, obligationId, dto);
  }
}
