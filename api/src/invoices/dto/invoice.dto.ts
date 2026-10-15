import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
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

export class CreateInvoiceDto {
  @IsUUID()
  customerId!: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateInvoiceStatusDto {
  @IsString()
  @MaxLength(20)
  status!: string;
}

export class CreateInvoicePaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsIn(['mpesa', 'bank', 'cash', 'card', 'cheque'])
  method!: 'mpesa' | 'bank' | 'cash' | 'card' | 'cheque';

  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}


export class ReconcileInvoicePaymentDto {
  @IsString()
  @MaxLength(120)
  statementReference!: string;
}
