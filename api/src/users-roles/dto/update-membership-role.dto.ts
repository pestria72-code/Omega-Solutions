import { IsIn } from 'class-validator';

export class UpdateMembershipRoleDto {
  @IsIn(['admin', 'manager', 'staff', 'salesperson', 'viewer'])
  role!: 'admin' | 'manager' | 'staff' | 'salesperson' | 'viewer';
}
