import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions('customers:read')
  async list(
    @Request() req: { user: AuthenticatedUser },
    @Query('search') search?: string,
  ) {
    return this.customers.list(req.user, search);
  }

  @Get(':customerId')
  @RequirePermissions('customers:read')
  async getById(
    @Request() req: { user: AuthenticatedUser },
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.customers.getById(req.user, customerId);
  }

  @Post()
  @RequirePermissions('customers:write')
  async create(
    @Request() req: { user: AuthenticatedUser },
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(req.user, dto);
  }

  @Patch(':customerId')
  @RequirePermissions('customers:write')
  async update(
    @Request() req: { user: AuthenticatedUser },
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(req.user, customerId, dto);
  }

  @Delete(':customerId')
  @RequirePermissions('customers:write')
  async delete(
    @Request() req: { user: AuthenticatedUser },
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    await this.customers.delete(req.user, customerId);
    return { success: true };
  }
}
