import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../../../libs/entities/assessment/submission.entity';
import { ClassContext, SubmissionContext } from '../dtos/guard.dto';
import { ClassPermissionService } from './class-permission.service';
import { TeamPermissionService } from './team-permission.service';

@Injectable()
export class SubmissionPermissionService {
    constructor(
        @InjectRepository(Submission)
        private readonly submissionRepo: Repository<Submission>,
        private readonly classPermissionService: ClassPermissionService,
        private readonly teamPermissionService: TeamPermissionService,
    ) { }

    async getClassIdFromSubmission(submissionId: number): Promise<number | null> {
        const submission = await this.submissionRepo.findOne({
            where: { id: submissionId },
            relations: ['assessment', 'assessment.class'],
        });
        return submission?.assessment?.class?.id ?? null;
    }

    async getClassContextFromSubmission(
        userId: number,
        submissionId: number,
    ): Promise<ClassContext | null> {
        const classId = await this.getClassIdFromSubmission(submissionId);
        if (!classId) return null;
        return this.classPermissionService.getClassContext(userId, classId);
    }

    async getSubmissionContext(
        userId: number,
        submissionId: number,
    ): Promise<SubmissionContext | null> {
        const submission = await this.submissionRepo.findOne({
            where: { id: submissionId },
            relations: [
                'assessment',
                'assessment.class',
                'assessment.class.owner',
                'user',
                'team',
                'team.members',
                'team.members.user',
                'evaluation',
                'resources',
                'resources.resource',
            ],
        });
        if (!submission) return null;

        const classContext = await this.classPermissionService.getClassContext(
            userId,
            submission.assessment.class.id,
        );
        if (!classContext) return null;

        return {
            submissionId,
            userId,
            submissionEntity: submission,
            classContext,
        };
    }

    async isMemberOfSubmissionClass(userId: number, submissionId: number): Promise<boolean> {
        const classId = await this.getClassIdFromSubmission(submissionId);
        if (!classId) return false;
        return this.classPermissionService.isMemberOfClass(userId, classId);
    }

    async isInstructorOfSubmissionClass(userId: number, submissionId: number): Promise<boolean> {
        const classId = await this.getClassIdFromSubmission(submissionId);
        if (!classId) return false;
        return this.classPermissionService.isInstructorOfClass(userId, classId);
    }

    async isOwnerOfSubmissionClass(userId: number, submissionId: number): Promise<boolean> {
        const classId = await this.getClassIdFromSubmission(submissionId);
        if (!classId) return false;
        return this.classPermissionService.isOwnerOfClass(userId, classId);
    }

    // COMBINED CHECKS

    async canSubmitToAssessment(
        userId: number,
        classId: number,
        teamId?: number,
    ): Promise<boolean> {
        // Must be enrolled in class
        const isMember = await this.classPermissionService.isMemberOfClass(userId, classId);
        if (!isMember) return false;

        // If team-based, must be approved team member
        if (teamId) {
            return this.teamPermissionService.isApprovedMemberOfTeam(userId, teamId);
        }

        return true;
    }

    async canViewSubmissions(
        userId: number,
        classId: number,
        submissionOwnerId: number,
    ): Promise<boolean> {
        const isInstructor = await this.classPermissionService.isInstructorOfClass(userId, classId);
        if (isInstructor) return true;

        // Students can only view their own
        return userId === submissionOwnerId;
    }
}
