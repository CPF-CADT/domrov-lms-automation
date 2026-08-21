import type { UserResponseDto } from './user';

export interface Team {
  id: number;
  leader_id: number;
  class_id: number;
  name: string;
  max_member: number;
  join_code: string;
}

// API DTOs
export interface CreateTeamDto {
  name: string;
  maxMember: number;
  classId: number;
}

export interface CreateTeamItemDto {
  name: string;
  maxMember: number;
  leaderId?: number;
  memberIds?: number[];
}

export interface CreateManyTeamsDto {
  classId: number;
  teams: CreateTeamItemDto[];
}

export interface TeamResponseDto {
  id: number;
  name: string;
  joinCode: string;
  maxMember: number;
  leader: UserResponseDto | null;
  members?: UserResponseDto[];
}

export interface JoinTeamDto {
  joinCode: string;
}

export interface InviteTeamByEmailDto {
  email: string;
}

export interface JoinTeamByTokenDto {
  token: string;
}

export interface JoinTeamResponseDto {
  message: string;
  teamId: number;
}

export interface CreateManyTeamsResponseDto {
  message: string;
  teams: TeamResponseDto[];
}
