import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from '../../../libs/entities/assessment/assessment.entity';
import { AssessmentContext, ClassContext } from '../dtos/guard.dto';
import { ClassPermissionService } from './class-permission.service';

@Injectable()
export class AssessmentPermissionService {
    constructor(
        @InjectRepository(Assessment)
        private readonly assessmentRepo: Repository<Assessment>,
        private readonly classPermissionService: ClassPermissionService,
    ) { }

    async getAssessmentContext(
        userId: number,
        assessmentId: number,
    ): Promise<AssessmentContext | null> {
        const assessment = await this.assessmentRepo.findOne({
            where: { id: assessmentId },
            relations: ['class', 'class.owner'],
        });

        if (!assessment || !assessment.class) {
            return null;
        }

        const classContext = await this.classPermissionService.getClassContext(
            userId,
            assessment.class.id,
        );

        if (!classContext) {
            return null;
        }

        return {
            assessmentId,
            userId,
            assessmentEntity: assessment,
            classContext,
        };
    }

    async getClassIdFromAssessment(assessmentId: number): Promise<number | null> {
        const assessment = await this.assessmentRepo.findOne({
            where: { id: assessmentId },
            relations: ['class'],
        });
        return assessment?.class?.id ?? null;
    }

    async getClassContextFromAssessment(
        userId: number,
        assessmentId: number,
    ): Promise<ClassContext | null> {
        const classId = await this.getClassIdFromAssessment(assessmentId);
        if (!classId) return null;
        return this.classPermissionService.getClassContext(userId, classId);
    }

    async isMemberOfAssessmentClass(userId: number, assessmentId: number): Promise<boolean> {
        const classId = await this.getClassIdFromAssessment(assessmentId);
        if (!classId) return false;
        return this.classPermissionService.isMemberOfClass(userId, classId);
    }

    async isStudentOfAssessmentClass(userId: number, assessmentId: number): Promise<boolean> {
        const classId = await this.getClassIdFromAssessment(assessmentId);
        if (!classId) return false;
        return this.classPermissionService.isStudentOfClass(userId, classId);
    }

    async isInstructorOfAssessmentClass(userId: number, assessmentId: number): Promise<boolean> {
        const classId = await this.getClassIdFromAssessment(assessmentId);
        if (!classId) return false;
        return this.classPermissionService.isInstructorOfClass(userId, classId);
    }

    async isOwnerOfAssessmentClass(userId: number, assessmentId: number): Promise<boolean> {
        const classId = await this.getClassIdFromAssessment(assessmentId);
        if (!classId) return false;
        return this.classPermissionService.isOwnerOfClass(userId, classId);
    }
}
