import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { UpdateSalesOrderStatusDto } from './dto/sales-order.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('sales-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesOrdersController {
  constructor(private readonly orders: SalesOrdersService) {}

  @Get()
  @RequirePermissions('sales:read')
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.orders.list(req.user);
  }

  @Get(':id')
  @RequirePermissions('sales:read')
  getById(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.orders.getById(req.user, id);
  }

  @Post('from-quotation/:quotationId')
  @RequirePermissions('sales:write')
  createFromQuotation(@Req() req: { user: AuthenticatedUser }, @Param('quotationId') quotationId: string) {
    return this.orders.createFromQuotation(req.user, quotationId);
  }

  @Patch(':id/status')
  @RequirePermissions('sales:write')
  updateStatus(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string, @Body() dto: UpdateSalesOrderStatusDto) {
    return this.orders.updateStatus(req.user, id, dto.status);
  }
}
