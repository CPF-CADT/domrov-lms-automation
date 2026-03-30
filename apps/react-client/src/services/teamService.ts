import axiosInstance from '@/lib/axiosInstance';
import type { ApiResponse, MessageResponse } from '@/types/api';
import type {
    TeamResponseDto,
    CreateTeamDto,
    CreateManyTeamsDto,
    CreateManyTeamsResponseDto,
    JoinTeamDto,
    JoinTeamByTokenDto,
    JoinTeamResponseDto,
    InviteTeamByEmailDto,
} from '@/types/team';

/**
 * Create a new team
 */
export async function createTeam(data: CreateTeamDto): Promise<TeamResponseDto> {
    const response = (await axiosInstance.post('/team', data)).data;
    return response.data;
}

/**
 * Create multiple teams at once
 */
export async function createManyTeams(data: CreateManyTeamsDto): Promise<CreateManyTeamsResponseDto> {
    const response = (await axiosInstance.post('/team/many', data)).data;
    return response.data;
}

/**
 * Join team by join code
 */
export async function joinTeamByCode(data: JoinTeamDto): Promise<JoinTeamResponseDto> {
    const response = (await axiosInstance.post('/team/join/code', data)).data;
    return response.data;
}

/**
 * Join team by token
 */
export async function joinTeamByToken(data: JoinTeamByTokenDto): Promise<JoinTeamResponseDto> {
    const response = (await axiosInstance.post('/team/join/token', data)).data;
    return response.data;
}

/**
 * Get teams by class ID
 */
export async function getTeamsByClass(classId: number): Promise<TeamResponseDto[]> {
    const response = (await axiosInstance.get(`/team/class/${classId}`)).data;
    return response.data;
}

/**
 * Get team details
 */
export async function getTeamDetails(teamId: number): Promise<TeamResponseDto> {
    const response = (await axiosInstance.get(`/team/${teamId}`)).data;
    return response.data;
}

/**
 * Invite team member by email
 */
export async function inviteTeamByEmail(teamId: number, data: InviteTeamByEmailDto): Promise<MessageResponse> {
    const response = (await axiosInstance.post(`/team/${teamId}/invite`, data)).data;
    return response.data;
}

/**
 * Leave a team
 */
export async function leaveTeam(teamId: number): Promise<MessageResponse> {
    const response = (await axiosInstance.post(`/team/${teamId}/leave`)).data;
    return response.data;
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: number): Promise<MessageResponse> {
    const response = (await axiosInstance.delete(`/team/${teamId}`)).data;
    return response.data;
}

const teamService = {
    createTeam,
    createManyTeams,
    joinTeamByCode,
    joinTeamByToken,
    getTeamsByClass,
    getTeamDetails,
    inviteTeamByEmail,
    leaveTeam,
    deleteTeam,
};

export default teamService;
