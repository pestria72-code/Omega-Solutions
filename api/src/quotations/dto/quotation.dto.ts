import { ArrayMinSize, IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuotationItemDto {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class CreateQuotationDto {
  @IsUUID()
  customerId!: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  validUntil!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateQuotationStatusDto {
  @IsString()
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'])
  status!: string;
}
