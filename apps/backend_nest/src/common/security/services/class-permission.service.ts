import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../../../libs/entities/classroom/enrollment.entity';
import { Class } from '../../../libs/entities/classroom/class.entity';
import { UserRole } from '../../../libs/enums/Role';
import { ClassContext } from '../dtos/guard.dto';

@Injectable()
export class ClassPermissionService {
    constructor(
        @InjectRepository(Enrollment)
        private readonly enrollmentRepo: Repository<Enrollment>,
        @InjectRepository(Class)
        private readonly classRepo: Repository<Class>,
    ) { }

    async getClassContext(
        userId: number,
        classId: number,
    ): Promise<ClassContext | null> {
        const classEntity = await this.classRepo.findOne({
            where: { id: classId },
            relations: ['owner'],
        });

        if (!classEntity) {
            return null;
        }

        const isOwner = classEntity.owner?.id === userId;

        const enrollment = await this.enrollmentRepo.findOne({
            where: {
                class: { id: classId },
                user: { id: userId },
            },
        });

        if (!enrollment && !isOwner) {
            return null;
        }

        return {
            classId,
            userId,
            role: isOwner ? UserRole.Teacher : enrollment?.role || UserRole.Student,
            isOwner,
            classEntity,
            enrollment: enrollment || undefined,
        };
    }

    async isMemberOfClass(userId: number, classId: number): Promise<boolean> {
        const context = await this.getClassContext(userId, classId);
        return context !== null;
    }

    async isStudentOfClass(userId: number, classId: number): Promise<boolean> {
        const context = await this.getClassContext(userId, classId);
        return context?.role === UserRole.Student;
    }

    async isInstructorOfClass(userId: number, classId: number): Promise<boolean> {
        const context = await this.getClassContext(userId, classId);
        if (!context) return false;
        return (
            context.role === UserRole.Teacher ||
            context.role === UserRole.TeacherAssistant ||
            context.isOwner
        );
    }

    async isOwnerOfClass(userId: number, classId: number): Promise<boolean> {
        const classEntity = await this.classRepo.findOne({
            where: { id: classId },
            relations: ['owner'],
        });
        return classEntity?.owner?.id === userId;
    }

    // CLASS VERIFICATION (throws exception)

    async verifyIsMember(userId: number, classId: number): Promise<ClassContext> {
        const classEntity = await this.classRepo.findOne({
            where: { id: classId },
        });
        if (!classEntity) {
            throw new NotFoundException(`Class with ID ${classId} not found`);
        }

        const context = await this.getClassContext(userId, classId);
        if (!context) {
            throw new ForbiddenException('You are not enrolled in this class');
        }

        return context;
    }

    async verifyIsStudent(
        userId: number,
        classId: number,
    ): Promise<ClassContext> {
        const context = await this.verifyIsMember(userId, classId);

        if (context.role !== UserRole.Student) {
            throw new ForbiddenException('You must be a student of this class');
        }

        return context;
    }

    async verifyIsInstructor(
        userId: number,
        classId: number,
    ): Promise<ClassContext> {
        const context = await this.verifyIsMember(userId, classId);

        if (
            context.role !== UserRole.Teacher &&
            context.role !== UserRole.TeacherAssistant &&
            !context.isOwner
        ) {
            throw new ForbiddenException('Only instructors can perform this action');
        }

        return context;
    }

    async verifyIsOwner(userId: number, classId: number): Promise<ClassContext> {
        const context = await this.verifyIsMember(userId, classId);

        if (!context.isOwner) {
            throw new ForbiddenException(
                'Only the class owner can perform this action',
            );
        }

        return context;
    }
}
