import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard.js';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CompaniesService, CompanyInput } from './companies.service.js';

const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authUserId;
  },
);

@Controller('companies/:organizationId')
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  getCompany(
    @CurrentUserId() userId: string,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.companies.getForOrganization(userId, organizationId);
  }

  @Post()
  createCompany(
    @CurrentUserId() userId: string,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() body: CompanyInput,
  ) {
    return this.companies.createForOrganization(userId, organizationId, body);
  }

  @Patch()
  updateCompany(
    @CurrentUserId() userId: string,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() body: CompanyInput,
  ) {
    return this.companies.updateForOrganization(userId, organizationId, body);
  }
}
