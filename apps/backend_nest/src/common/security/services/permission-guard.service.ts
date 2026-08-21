import { Injectable } from '@nestjs/common';
import { ClassContext, TeamContext, AssessmentContext, SubmissionContext } from '../dtos/guard.dto';
import { ClassPermissionService } from './class-permission.service';
import { TeamPermissionService } from './team-permission.service';
import { AssessmentPermissionService } from './assessment-permission.service';
import { SubmissionPermissionService } from './submission-permission.service';

export type { ClassContext, TeamContext, AssessmentContext, SubmissionContext } from '../dtos/guard.dto';

@Injectable()
export class PermissionGuardService {
    constructor(
        private readonly classPermission: ClassPermissionService,
        private readonly teamPermission: TeamPermissionService,
        private readonly assessmentPermission: AssessmentPermissionService,
        private readonly submissionPermission: SubmissionPermissionService,
    ) { }

    // ==================== CLASS DELEGATION ====================

    async getClassContext(userId: number, classId: number): Promise<ClassContext | null> {
        return this.classPermission.getClassContext(userId, classId);
    }

    async isMemberOfClass(userId: number, classId: number): Promise<boolean> {
        return this.classPermission.isMemberOfClass(userId, classId);
    }

    async isStudentOfClass(userId: number, classId: number): Promise<boolean> {
        return this.classPermission.isStudentOfClass(userId, classId);
    }

    async isInstructorOfClass(userId: number, classId: number): Promise<boolean> {
        return this.classPermission.isInstructorOfClass(userId, classId);
    }

    async isOwnerOfClass(userId: number, classId: number): Promise<boolean> {
        return this.classPermission.isOwnerOfClass(userId, classId);
    }

    async verifyIsMember(userId: number, classId: number): Promise<ClassContext> {
        return this.classPermission.verifyIsMember(userId, classId);
    }

    async verifyIsStudent(userId: number, classId: number): Promise<ClassContext> {
        return this.classPermission.verifyIsStudent(userId, classId);
    }

    async verifyIsInstructor(userId: number, classId: number): Promise<ClassContext> {
        return this.classPermission.verifyIsInstructor(userId, classId);
    }

    async verifyIsOwner(userId: number, classId: number): Promise<ClassContext> {
        return this.classPermission.verifyIsOwner(userId, classId);
    }

    // ==================== TEAM DELEGATION ====================

    async getTeamContext(userId: number, teamId: number): Promise<TeamContext | null> {
        return this.teamPermission.getTeamContext(userId, teamId);
    }

    async isMemberOfTeam(userId: number, teamId: number): Promise<boolean> {
        return this.teamPermission.isMemberOfTeam(userId, teamId);
    }

    async isApprovedMemberOfTeam(userId: number, teamId: number): Promise<boolean> {
        return this.teamPermission.isApprovedMemberOfTeam(userId, teamId);
    }

    async isLeaderOfTeam(userId: number, teamId: number): Promise<boolean> {
        return this.teamPermission.isLeaderOfTeam(userId, teamId);
    }

    async canManageTeam(userId: number, teamId: number): Promise<boolean> {
        return this.teamPermission.canManageTeam(userId, teamId);
    }

    async verifyIsTeamMember(userId: number, teamId: number): Promise<TeamContext> {
        return this.teamPermission.verifyIsTeamMember(userId, teamId);
    }

    async verifyIsApprovedTeamMember(userId: number, teamId: number): Promise<TeamContext> {
        return this.teamPermission.verifyIsApprovedTeamMember(userId, teamId);
    }

    async verifyIsTeamLeader(userId: number, teamId: number): Promise<TeamContext> {
        return this.teamPermission.verifyIsTeamLeader(userId, teamId);
    }

    async verifyCanManageTeam(userId: number, teamId: number): Promise<TeamContext> {
        return this.teamPermission.verifyCanManageTeam(userId, teamId);
    }

    // ==================== ASSESSMENT DELEGATION ====================

    async getAssessmentContext(userId: number, assessmentId: number): Promise<AssessmentContext | null> {
        return this.assessmentPermission.getAssessmentContext(userId, assessmentId);
    }

    async getClassIdFromAssessment(assessmentId: number): Promise<number | null> {
        return this.assessmentPermission.getClassIdFromAssessment(assessmentId);
    }

    async getClassContextFromAssessment(userId: number, assessmentId: number): Promise<ClassContext | null> {
        return this.assessmentPermission.getClassContextFromAssessment(userId, assessmentId);
    }

    // ==================== SUBMISSION DELEGATION ====================

    async getSubmissionContext(userId: number, submissionId: number): Promise<SubmissionContext | null> {
        return this.submissionPermission.getSubmissionContext(userId, submissionId);
    }

    async getClassIdFromSubmission(submissionId: number): Promise<number | null> {
        return this.submissionPermission.getClassIdFromSubmission(submissionId);
    }

    async getClassContextFromSubmission(userId: number, submissionId: number): Promise<ClassContext | null> {
        return this.submissionPermission.getClassContextFromSubmission(userId, submissionId);
    }

    async canSubmitToAssessment(userId: number, classId: number, teamId?: number): Promise<boolean> {
        return this.submissionPermission.canSubmitToAssessment(userId, classId, teamId);
    }

    async canViewSubmissions(userId: number, classId: number, submissionOwnerId: number): Promise<boolean> {
        return this.submissionPermission.canViewSubmissions(userId, classId, submissionOwnerId);
    }
}
