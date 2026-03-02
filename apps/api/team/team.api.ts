// /api/team/team.api.ts
import axiosInstance from '../axios';
import {
  CreateTeamDto,
  CreateManyTeamsDto,
  TeamResponseDto,
  JoinTeamDto,
  JoinTeamByTokenDto,
  InviteTeamByEmailDto,
  JoinTeamResponseDto,
  CreateManyTeamsResponseDto,
  MessageResponseDto
} from './dto';

export async function createTeam(data: CreateTeamDto): Promise<TeamResponseDto> {
  try {
    const response = await axiosInstance.post<TeamResponseDto>(`/team`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function createManyTeams(data: CreateManyTeamsDto): Promise<CreateManyTeamsResponseDto> {
  try {
    const response = await axiosInstance.post<CreateManyTeamsResponseDto>(`/team/many`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function joinTeamByCode(data: JoinTeamByCodeDto): Promise<JoinTeamResponseDto> {
  try {
    const response = await axiosInstance.post<JoinTeamResponseDto>(`/team/join/code`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function joinTeamByToken(data: JoinTeamByTokenDto): Promise<JoinTeamResponseDto> {
  try {
    const response = await axiosInstance.post<JoinTeamResponseDto>(`/team/join/token`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function getTeamsByClass(classId: number): Promise<TeamResponseDto[]> {
  try {
    const response = await axiosInstance.get<TeamResponseDto[]>(`/team/class/${classId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function getTeamDetails(teamId: number): Promise<TeamResponseDto> {
  try {
    const response = await axiosInstance.get<TeamResponseDto>(`/team/${teamId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function inviteTeamByEmail(teamId: number, data: InviteTeamByEmailDto): Promise<MessageResponseDto> {
  try {
    const response = await axiosInstance.post<MessageResponseDto>(`/team/${teamId}/invite`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function leaveTeam(teamId: number): Promise<MessageResponseDto> {
  try {
    const response = await axiosInstance.delete<MessageResponseDto>(`/team/${teamId}/leave`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

export async function removeMember(teamId: number, memberId: number): Promise<MessageResponseDto> {
  try {
    const response = await axiosInstance.delete<MessageResponseDto>(`/team/${teamId}/members/${memberId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}
