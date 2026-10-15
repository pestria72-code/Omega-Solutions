import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
@Controller('accounting')
@UseGuards(JwtAuthGuard,PermissionsGuard)
export class AccountingController {
 constructor(private readonly accounting:AccountingService){}
 @Get('accounts') @RequirePermissions('accounting:read') accounts(@Req() req:{user:AuthenticatedUser}){return this.accounting.listAccounts(req.user);}
 @Post('accounts') @RequirePermissions('accounting:write') createAccount(@Req() req:{user:AuthenticatedUser},@Body() dto:CreateAccountDto){return this.accounting.createAccount(req.user,dto);}
 @Get('reconciliation/payables') @RequirePermissions('accounting:read') payablesReconciliation(@Req() req:{user:AuthenticatedUser}){return this.accounting.payablesReconciliation(req.user);}
 @Get('reconciliation/receivables') @RequirePermissions('accounting:read') receivablesReconciliation(@Req() req:{user:AuthenticatedUser}){return this.accounting.receivablesReconciliation(req.user);}
 @Get('journals') @RequirePermissions('accounting:read') journals(@Req() req:{user:AuthenticatedUser}){return this.accounting.listJournals(req.user);}
 @Get('journals/:id') @RequirePermissions('accounting:read') journal(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.accounting.getJournal(req.user,id);}
}
