import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { SystemRole, UserStatus } from '../entities/user.entity';

export class UpdateUserStatusRequest {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class UpdateUserRoleRequest {
  @IsEnum(SystemRole)
  role!: SystemRole;
}

export class ListUsersQuery {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;
}
