import { IsIn } from 'class-validator';

export class UpdateMembershipRoleDto {
  @IsIn(['admin', 'manager', 'staff', 'viewer'])
  role!: 'admin' | 'manager' | 'staff' | 'viewer';
}
