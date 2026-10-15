import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class PosCheckoutItemDto {
  @IsUUID() productId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) taxRate?: number;
}

export class PosCheckoutPaymentDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsIn(['mpesa','bank','cash','card','cheque']) method!: 'mpesa'|'bank'|'cash'|'card'|'cheque';
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
}

export class PosCheckoutDto {
  @IsUUID() requestId!: string;
  @IsUUID() shiftId!: string;
  @IsUUID() warehouseId!: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(() => PosCheckoutItemDto) items!: PosCheckoutItemDto[];
  @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(() => PosCheckoutPaymentDto) payments!: PosCheckoutPaymentDto[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
