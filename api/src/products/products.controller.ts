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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';

@Controller('products')
@RequireModule('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleEntitlementsGuard)
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

  @Post(':id/image')
  @RequirePermissions('products:write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadImage(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('Select an image file to upload.');
    return this.products.uploadImage(req.user, id, file);
  }

  @Delete(':id/image')
  @RequirePermissions('products:write')
  removeImage(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.products.removeImage(req.user, id);
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
