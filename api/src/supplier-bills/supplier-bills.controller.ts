import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { SupplierBillsService } from './supplier-bills.service.js';
import { CreateSupplierBillDto, RecordSupplierBillPaymentDto } from './dto/supplier-bill.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';

@Controller('supplier-bills')
@RequireModule('procurement')
@UseGuards(JwtAuthGuard,PermissionsGuard, ModuleEntitlementsGuard)
export class SupplierBillsController {
 constructor(private readonly bills:SupplierBillsService){}
 @Get() @RequirePermissions('purchases:read') list(@Req() req:{user:AuthenticatedUser}){return this.bills.list(req.user);}
 @Get(':id') @RequirePermissions('purchases:read') getById(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.bills.getById(req.user,id);}
 @Post() @RequirePermissions('purchases:write') create(@Req() req:{user:AuthenticatedUser},@Body() dto:CreateSupplierBillDto){return this.bills.create(req.user,dto);}
 @Post(':id/payments') @RequirePermissions('purchases:write') recordPayment(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string,@Body() dto:RecordSupplierBillPaymentDto){return this.bills.recordPayment(req.user,id,dto);}
}
