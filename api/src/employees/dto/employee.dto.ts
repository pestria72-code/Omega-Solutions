import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() @MinLength(1) @MaxLength(50) employeeNumber!: string;
  @IsOptional() @IsString() @MaxLength(32) nationalId?: string;
  @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @IsOptional() @IsEmail() @MaxLength(320) workEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) jobTitle?: string;
  @IsOptional() @IsString() @MaxLength(120) department?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsDateString() hireDate?: string;
}
export class CreateLeaveRequestDto {
  @IsUUID() employeeId!: string;
  @IsIn(['annual','sick','maternity','paternity','compassionate','unpaid','other']) leaveType!: 'annual'|'sick'|'maternity'|'paternity'|'compassionate'|'unpaid'|'other';
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}
export class ReviewLeaveRequestDto {
  @IsIn(['approved','rejected']) status!: 'approved'|'rejected';
  @IsOptional() @IsString() @MaxLength(2000) reviewNote?: string;
}
