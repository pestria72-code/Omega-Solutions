import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  county?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;
}

export class UpdateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  county?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @IsString()
  @Matches(/^(active|inactive|blocked)$/, { message: 'status must be active, inactive, or blocked' })
  @IsOptional()
  status?: string;
}
