import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { SystemRole, UserStatus } from '../entities/user.entity';

const normalizeStatus = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toUpperCase() : value;
const normalizeRole = ({ value }: { value: unknown }) =>
  Object.values(SystemRole).find((role) => role.toLowerCase() === String(value).toLowerCase()) ?? value;
const omitAll = ({ value }: { value: unknown }) => value === 'all' ? undefined : value;

export class UpdateUserStatusRequest {
  @Transform(normalizeStatus)
  @IsEnum(UserStatus)
  status!: UserStatus;

  // Accepted for legacy clients; no status-reason history is stored in auth_db.
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserRoleRequest {
  @Transform(normalizeRole)
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

  @Transform((input) => normalizeStatus({ value: omitAll(input) }))
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @Transform((input) => normalizeRole({ value: omitAll(input) }))
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;

  @Transform(omitAll)
  @IsOptional()
  @IsIn(['true', 'false', 'verified', 'unverified'])
  verified?: string;

  @IsOptional()
  @IsDateString()
  joinDateFrom?: string;

  @IsOptional()
  @IsDateString()
  joinDateTo?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sortBy?: string;
}
