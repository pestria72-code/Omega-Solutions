import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { PosService } from './pos.service.js';
import { PosCheckoutDto } from './dto/pos-checkout.dto.js';

@Controller('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('registers')
  @RequirePermissions('sales:read')
  listRegisters(@Req() req: { user: AuthenticatedUser }) { return this.pos.listRegisters(req.user); }

  @Post('registers')
  @RequirePermissions('sales:write')
  createRegister(@Req() req: { user: AuthenticatedUser }, @Body() body: { code: string; name: string; branchId?: string | null }) {
    return this.pos.createRegister(req.user, body);
  }

  @Get('products')
  @RequirePermissions('products:read')
  searchProducts(@Req() req: { user: AuthenticatedUser }, @Query('search') search?: string, @Query('warehouseId') warehouseId?: string) {
    return this.pos.searchProducts(req.user, search, warehouseId);
  }

  @Get('sales')
  @RequirePermissions('sales:read')
  listSales(@Req() req: { user: AuthenticatedUser }, @Query('limit') limit?: string) {
    return this.pos.listSales(req.user, limit);
  }

  @Post('checkout')
  @RequirePermissions('sales:write')
  checkout(@Req() req: { user: AuthenticatedUser }, @Body() dto: PosCheckoutDto) {
    return this.pos.checkout(req.user, dto);
  }

  @Get('shifts/current')
  @RequirePermissions('sales:read')
  currentShift(@Req() req: { user: AuthenticatedUser }) { return this.pos.currentShift(req.user); }

  @Post('shifts/open')
  @RequirePermissions('sales:write')
  openShift(@Req() req: { user: AuthenticatedUser }, @Body() body: { registerId: string; openingFloat: number }) {
    return this.pos.openShift(req.user, body);
  }

  @Post('shifts/:shiftId/close')
  @RequirePermissions('sales:write')
  closeShift(@Req() req: { user: AuthenticatedUser }, @Param('shiftId', ParseUUIDPipe) shiftId: string, @Body() body: { countedCash: number; notes?: string }) {
    return this.pos.closeShift(req.user, shiftId, body);
  }
}
