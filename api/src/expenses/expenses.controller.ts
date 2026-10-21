import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service.js';
import { CreateExpenseDto } from './dto/expense.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';

@Controller('expenses')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard,PermissionsGuard, ModuleEntitlementsGuard)
export class ExpensesController {
 constructor(private readonly expenses:ExpensesService){}
 @Get() @RequirePermissions('expenses:read')
 list(@Req() req:{user:AuthenticatedUser}){return this.expenses.list(req.user);}
 @Post() @RequirePermissions('expenses:write')
 create(@Req() req:{user:AuthenticatedUser},@Body() dto:CreateExpenseDto){return this.expenses.create(req.user,dto);}
}
