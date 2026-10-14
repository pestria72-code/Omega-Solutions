import { IsIn, IsString } from 'class-validator';
export class UpdateSalesOrderStatusDto {
  @IsString()
  @IsIn(['confirmed', 'processing', 'fulfilled', 'cancelled'])
  status!: string;
}
