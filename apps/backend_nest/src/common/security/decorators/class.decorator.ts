import { SetMetadata, applyDecorators } from '@nestjs/common';
import { UserRole } from '../../../libs/enums/Role';

export const CLASS_ID_KEY = 'classIdParam';
export const TEAM_ID_KEY = 'teamIdParam';
export const REQUIRED_ROLES_KEY = 'requiredRoles';
export const OWNER_ONLY_KEY = 'ownerOnly';
export const LEADER_ONLY_KEY = 'leaderOnly';

// Specify which route param contains the class ID
export const ClassId = (param: string = 'classId') => SetMetadata(CLASS_ID_KEY, param);

// Specify which route param contains the team ID
export const TeamId = (param: string = 'teamId') => SetMetadata(TEAM_ID_KEY, param);

// Specify required roles for accessing the endpoint
export const ClassRoles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

// Restrict access to class owner only
export const OwnerOnly = () => SetMetadata(OWNER_ONLY_KEY, true);

// Restrict access to team leader only
export const LeaderOnly = () => SetMetadata(LEADER_ONLY_KEY, true);
