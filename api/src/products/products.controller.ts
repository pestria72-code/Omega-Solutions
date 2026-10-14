import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermissions('products:read')
  list(@Req() req: { user: AuthenticatedUser }, @Query('search') search?: string) {
    return this.products.list(req.user, search);
  }

  @Get(':id')
  @RequirePermissions('products:read')
  getById(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.products.getById(req.user, id);
  }

  @Post()
  @RequirePermissions('products:write')
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateProductDto) {
    return this.products.create(req.user, dto);
  }

  @Patch(':id')
  @RequirePermissions('products:write')
  update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(req.user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('products:write')
  async delete(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.products.delete(req.user, id);
    return { success: true };
  }
}
