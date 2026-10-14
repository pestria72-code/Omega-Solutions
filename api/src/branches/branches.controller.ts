import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BranchesService } from './branches.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('companies/:companyId/branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions('branches:read')
  async list(
    @Request() req: { user: AuthenticatedUser },
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.branches.listByCompany(req.user, companyId);
  }

  @Get(':branchId')
  @RequirePermissions('branches:read')
  async getById(
    @Request() req: { user: AuthenticatedUser },
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    return this.branches.getById(req.user, companyId, branchId);
  }

  @Post()
  @RequirePermissions('branches:write')
  async create(
    @Request() req: { user: AuthenticatedUser },
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branches.create(req.user, companyId, dto);
  }

  @Patch(':branchId')
  @RequirePermissions('branches:write')
  async update(
    @Request() req: { user: AuthenticatedUser },
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(req.user, companyId, branchId, dto);
  }
}
