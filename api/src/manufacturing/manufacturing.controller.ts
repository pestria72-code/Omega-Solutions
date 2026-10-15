import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service.js';
import { CreateBomDto, CreateProductionOrderDto } from './dto/manufacturing.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('manufacturing')
@UseGuards(JwtAuthGuard,PermissionsGuard)
export class ManufacturingController {
 constructor(private readonly manufacturing:ManufacturingService){}
 @Get('boms') @RequirePermissions('manufacturing:read') listBoms(@Req() req:{user:AuthenticatedUser}){return this.manufacturing.listBoms(req.user);}
 @Get('boms/:id') @RequirePermissions('manufacturing:read') getBom(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.manufacturing.getBom(req.user,id);}
 @Post('boms') @RequirePermissions('manufacturing:write') createBom(@Req() req:{user:AuthenticatedUser},@Body() dto:CreateBomDto){return this.manufacturing.createBom(req.user,dto);}
 @Get('orders') @RequirePermissions('manufacturing:read') listOrders(@Req() req:{user:AuthenticatedUser}){return this.manufacturing.listOrders(req.user);}
 @Post('orders/:id/start') @RequirePermissions('manufacturing:write') startOrder(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.manufacturing.startOrder(req.user,id);}
 @Post('orders/:id/complete') @RequirePermissions('manufacturing:write') completeOrder(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.manufacturing.completeOrder(req.user,id);}
 @Post('orders') @RequirePermissions('manufacturing:write') createOrder(@Req() req:{user:AuthenticatedUser},@Body() dto:CreateProductionOrderDto){return this.manufacturing.createOrder(req.user,dto);}
}
