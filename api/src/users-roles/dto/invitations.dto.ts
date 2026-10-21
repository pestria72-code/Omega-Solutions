import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(['admin', 'manager', 'staff', 'salesperson', 'viewer'])
  role!: 'admin' | 'manager' | 'staff' | 'salesperson' | 'viewer';

  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}

export class AcceptInvitationDto {
  @IsString()
  @MaxLength(256)
  token!: string;
}
