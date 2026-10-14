import { IsEmail, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(180) contactName!: string;
  @IsOptional() @IsString() @MaxLength(180) organizationName?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) source?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedValue?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateLeadDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) contactName?: string;
  @IsOptional() @IsString() @MaxLength(180) organizationName?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) source?: string;
  @IsOptional() @IsIn(['new','qualified','unqualified','converted']) status?: 'new'|'qualified'|'unqualified'|'converted';
  @IsOptional() @IsNumber() @Min(0) estimatedValue?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOpportunityDto {
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsNumber() @Min(0) expectedValue?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsIn(['qualification','needs_analysis','proposal','negotiation','won','lost']) stage?: 'qualification'|'needs_analysis'|'proposal'|'negotiation'|'won'|'lost';
  @IsOptional() @IsString() expectedCloseDate?: string;
  @IsOptional() @IsString() lossReason?: string;
}
export class UpdateOpportunityDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) title?: string;
  @IsOptional() @IsNumber() @Min(0) expectedValue?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsIn(['qualification','needs_analysis','proposal','negotiation','won','lost']) stage?: 'qualification'|'needs_analysis'|'proposal'|'negotiation'|'won'|'lost';
  @IsOptional() @IsString() expectedCloseDate?: string;
  @IsOptional() @IsString() lossReason?: string;
}
export class CreateActivityDto {
  @IsString() @IsIn(['call','email','meeting','task','note']) activityType!: 'call'|'email'|'meeting'|'task'|'note';
  @IsString() @MinLength(2) @MaxLength(180) subject!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() opportunityId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() assignedUserId?: string;
  @IsOptional() @IsString() dueAt?: string;
}
export class UpdateActivityDto {
  @IsOptional() completed?: boolean;
}
