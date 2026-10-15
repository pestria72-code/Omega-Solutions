import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';
import { CreateInvoiceDto, CreateInvoicePaymentDto, ReconcileInvoicePaymentDto, UpdateInvoiceStatusDto } from './dto/invoice.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @RequirePermissions('sales:read')
  list(
    @Req() req: { user: AuthenticatedUser },
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.invoices.list(req.user, search, status);
  }

  @Get('team-summary')
  @RequirePermissions('sales:team-read')
  teamSummary(@Req() req: { user: AuthenticatedUser }) {
    return this.invoices.getSalesTeamSummary(req.user);
  }

  @Get(':id')
  @RequirePermissions('sales:read')
  getById(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.invoices.getById(req.user, id);
  }

  @Post()
  @RequirePermissions('sales:write')
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(req.user, dto);
  }

  @Post(':id/payments')
  @RequirePermissions('payments:write')
  recordPayment(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: CreateInvoicePaymentDto,
  ) {
    return this.invoices.recordPayment(req.user, id, dto);
  }

  @Post(':id/payments/:paymentId/confirm')
  @RequirePermissions('payments:verify')
  confirmPayment(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.invoices.confirmPayment(req.user, id, paymentId);
  }

  @Post(':id/payments/:paymentId/reject')
  @RequirePermissions('payments:verify')
  rejectPayment(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.invoices.rejectPayment(req.user, id, paymentId);
  }

  @Post(':id/payments/:paymentId/reconcile')
  @RequirePermissions('payments:reconcile')
  reconcilePayment(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: ReconcileInvoicePaymentDto,
  ) {
    return this.invoices.reconcilePayment(req.user, id, paymentId, dto.statementReference);
  }

  @Patch(':id/status')
  @RequirePermissions('sales:write')
  updateStatus(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoices.updateStatus(req.user, id, dto.status);
  }
}
