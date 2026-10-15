import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
export class UpdateSalesOrderStatusDto {
  @IsString()
  @IsIn(['confirmed', 'processing', 'fulfilled', 'cancelled'])
  status!: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
