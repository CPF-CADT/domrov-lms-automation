import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../../../libs/entities/class.entity';
import { Enrollment } from '../../../libs/entities/enrollment.entity';
import { User } from '../../../libs/entities/user.entity';
import { CreateClassDto } from '../../../libs/dtos/class/create-class.dto';
import { generateJoinCode } from '../../../libs/utils/GenerateRandom';
import { UserRole } from '../../../libs/enums/Role';
import { TransferOwnershipDto } from '../../../libs/dtos/class/transfer-ownership.dto';
import { AssignTADto } from '../../../libs/dtos/class/assign-ta.dto';
import { ClassStatus } from '../../../libs/enums/Status';
@Injectable()
export class ClassService {

    constructor(
        @InjectRepository(Class)
        private readonly classRepository: Repository<Class>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Enrollment)
        private readonly enrollmentRepository: Repository<Enrollment>,
    ) {
    }

    async createClass(createClassDto: CreateClassDto, ownerId: number) {
        const owner = await this.userRepository.findOneBy({ id: ownerId });
        if (!owner) {
            throw new NotFoundException('User not found');
        }

        let joinCode: string;
        let codeExists: boolean;
        do {
            joinCode = generateJoinCode();
            codeExists = !!(await this.classRepository.findOneBy({ joinCode }));
        } while (codeExists);

        const newClass = this.classRepository.create({
            ...createClassDto,
            owner,
            joinCode,
        });

        const savedClass = await this.classRepository.save(newClass);

        const enrollment = this.enrollmentRepository.create({
            user: owner,
            class: savedClass,
            role: UserRole.Teacher,
        });
        await this.enrollmentRepository.save(enrollment);

        return savedClass;
    }

    async joinClassWithCode(joinCode: string, studentId: number) {
        const classToJoin = await this.classRepository.findOneBy({ joinCode });
        if (!classToJoin) {
            throw new NotFoundException('Class not found with this code');
        }

        return this.enrollUserInClass(classToJoin.id, studentId);
    }

    async removeStudent(
        classId: number,
        studentId: number,
        teacherId: number,
    ) {
        await this.findClassAndVerifyTeacher(classId, teacherId);

        if (studentId === teacherId) {
            throw new BadRequestException('You cannot remove yourself');
        }

        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                class: { id: classId },
                user: { id: studentId },
            },
        });

        if (!enrollment) {
            throw new NotFoundException('Student not found in this class');
        }

        if (enrollment.role === UserRole.Teacher) {
            throw new ForbiddenException('Cannot remove another teacher');
        }

        await this.enrollmentRepository.remove(enrollment);
        return { message: 'Student removed successfully' };
    }

    private async enrollUserInClass(classId: number, studentId: number) {
        const student = await this.userRepository.findOneBy({ id: studentId });
        if (!student) throw new NotFoundException('User not found');

        const classToJoin = await this.classRepository.findOneBy({ id: classId });
        if (!classToJoin) throw new NotFoundException('Class not found');

        const existingEnrollment = await this.isUserEnrolled(classId, studentId);
        if (existingEnrollment) {
            throw new ConflictException('User is already enrolled in this class');
        }

        const enrollment = this.enrollmentRepository.create({
            user: student,
            class: classToJoin,
            role: UserRole.Student,
        });

        await this.enrollmentRepository.save(enrollment);
        return { message: 'Successfully joined class', classId: classToJoin.id };
    }

    private async findClassAndVerifyTeacher(
        classId: number,
        teacherId: number,
    ) {
        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                class: { id: classId },
                user: { id: teacherId },
            },
            relations: ['class'],
        });

        if (!enrollment) {
            throw new NotFoundException('Class not found or you are not enrolled');
        }

        if (enrollment.role !== UserRole.Teacher) {
            throw new ForbiddenException('You do not have permission for this action');
        }

        return { class: enrollment.class, enrollment };
    }

    private async isUserEnrolled(
        classId: number,
        userId: number,
    ): Promise<Enrollment | null> {
        return this.enrollmentRepository.findOne({
            where: {
                class: { id: classId },
                user: { id: userId },
            },
        });
    }

    async getClassesForUser(userId: number) {
        const enrollments = await this.enrollmentRepository.find({
            where: {
                user: { id: userId },
            },
            relations: ['class', 'class.owner'],
        });

        return enrollments.map((enrollment) => {
            const classData = enrollment.class;
            const owner = classData.owner;

            return {
                id: classData.id,
                name: classData.name,
                description: classData.description,
                coverImageUrl: classData.coverImageUrl,
                status: classData.status,
                owner: {
                    id: owner.id,
                    firstName: owner.firstName,
                    lastName: owner.lastName,
                    email: owner.email,
                },
                role: enrollment.role,
                ...(enrollment.role === UserRole.Teacher && {
                    joinCode: classData.joinCode,
                }),
            };
        });
    }

    async getStudentsInClass(classId: number, teacherId: number) {
        await this.findClassAndVerifyTeacher(classId, teacherId);
        const enrollments = await this.enrollmentRepository.find({
            where: {
                class: { id: classId },
                role: UserRole.Student,
            },
            relations: ['user'],
        });

        return enrollments.map((enrollment) => {
            const { password, refreshTokens, emailOtps, ...studentDetails } =
                enrollment.user;
            return studentDetails;
        });
    }

    async transferOwnership(transferOwnershipDto: TransferOwnershipDto, currentOwnerId: number) {
        const { classId, newOwnerId } = transferOwnershipDto;

        const classToTransfer = await this.classRepository.findOne({
            where: { id: classId },
            relations: ['owner'],
        });
        if (!classToTransfer) throw new NotFoundException('Class not found');
        if (classToTransfer.owner.id !== currentOwnerId)
            throw new ForbiddenException('Only the current owner can transfer ownership');

        const newOwnerEnrollment = await this.enrollmentRepository.findOne({
            where: {
                class: { id: classId },
                user: { id: newOwnerId },
            },
            relations: ['user'],
        });
        if (!newOwnerEnrollment) throw new NotFoundException('New owner must be enrolled in this class');

        const currentOwnerEnrollment = await this.enrollmentRepository.findOne({
            where: { class: { id: classId }, user: { id: currentOwnerId } },
        });
        if (!currentOwnerEnrollment) throw new NotFoundException('Current owner enrollment not found');

        newOwnerEnrollment.role = UserRole.Teacher;
        currentOwnerEnrollment.role = UserRole.TeacherAssistant;

        await this.enrollmentRepository.save([newOwnerEnrollment, currentOwnerEnrollment]);

        classToTransfer.owner = newOwnerEnrollment.user;
        await this.classRepository.save(classToTransfer);

        return { message: 'Ownership transferred successfully' };
    }

    async assignTA(dto: AssignTADto, teacherId: number) {
        const { classId, taId } = dto;

        const teacherEnrollment = await this.enrollmentRepository.findOne({
            where: {
                user: { id: teacherId },
                class: { id: classId },
                role: UserRole.Teacher,
            },
            relations: ['class'],
        });

        if (!teacherEnrollment) {
            throw new ForbiddenException('You are not a teacher of this class.');
        }

        const classEntity = teacherEnrollment.class;

        const taUser = await this.userRepository.findOneBy({ id: taId });
        if (!taUser) {
            throw new NotFoundException('TA user not found.');
        }

        const existingEnrollment = await this.enrollmentRepository.findOne({
            where: {
                user: { id: taId },
                class: { id: classId },
            },
        });

        if (existingEnrollment) {
            existingEnrollment.role = UserRole.TeacherAssistant;
            await this.enrollmentRepository.save(existingEnrollment);
        } else {
            const newTAEnrollment = this.enrollmentRepository.create({
                user: taUser,
                class: classEntity,
                role: UserRole.TeacherAssistant,
            });
            await this.enrollmentRepository.save(newTAEnrollment);
        }

        return { message: `User ${taId} assigned as TA for class ${classId}.` };
    }

    async markClassComplete(classId: number, teacherId: number) {
        const teacherEnrollment = await this.enrollmentRepository.findOne({
            where: {
                user: { id: teacherId },
                class: { id: classId },
                role: UserRole.Teacher,
            },
            relations: ['class'],
        });

        if (!teacherEnrollment) {
            throw new ForbiddenException('You are not the teacher of this class.');
        }

        const classEntity = teacherEnrollment.class;

        classEntity.status = ClassStatus.END;
        await this.classRepository.save(classEntity);

        return { message: `Class "${classEntity.name}" marked as completed.` };
    }



    // async joinClassWithLink(token: string, studentId: number) {
    //     try {
    //         const payload = await this.jwtService.verifyAsync(token, {
    //             secret: this.INVITE_SECRET,
    //         });

    //         if (!payload.classId) throw new Error();

    //         return this.enrollUserInClass(payload.classId, studentId);
    //     } catch (error) {
    //         throw new BadRequestException('Invalid or expired invite link');
    //     }
    // }

    // async inviteByEmail(
    //     classId: number,
    //     email: string,
    //     teacherId: number,
    // ) {
    //     const { class: classToJoin, enrollment: teacherEnrollment } =
    //         await this.findClassAndVerifyTeacher(classId, teacherId);

    //     const userToInvite = await this.userRepository.findOneBy({ email });
    //     if (!userToInvite) {
    //         throw new NotFoundException(
    //             'User with this email not found. They must register first.',
    //         );
    //     }

    //     const existingEnrollment = await this.isUserEnrolled(
    //         classToJoin.id,
    //         userToInvite.id,
    //     );
    //     if (existingEnrollment) {
    //         throw new ConflictException('User is already in this class');
    //     }

    //     const { link } = await this.generateInviteLink(classId, teacherId, true);

    //     // Use MailerService directly
    //     await this.mailerService.sendMail({
    //         to: userToInvite.email,
    //         subject: `You're invited to join ${classToJoin.name}!`,
    //         text: `Hello ${userToInvite.firstName},\n\nYou have been invited to join the class "${classToJoin.name}".\nClick this link to join: ${link}\n\nIf you did not expect this, please ignore this email.`,
    //         html: `<p>Hello ${userToInvite.firstName},</p>
    //             <p>You have been invited to join the class "<b>${classToJoin.name}</b>".</p>
    //             <p>Click the link below to join:</p>
    //             <a href="${link}">Join Class</a>
    //             <p>If you did not expect this, please ignore this email.</p>`,
    //     });

    //     return { message: `Invite sent to ${email}` };
    // }

    // async generateInviteLink(
    //     classId: number,
    //     teacherId: number,
    //     internalCall: boolean = false,
    // ) {
    //     if (!internalCall) {
    //         await this.findClassAndVerifyTeacher(classId, teacherId);
    //     }

    //     const payload = { classId };
    //     const token = await this.jwtService.signAsync(payload, {
    //         secret: this.INVITE_SECRET,
    //         expiresIn: '7d', // Link is valid for 7 days
    //     });

    //     return {
    //         link: `${this.BASE_URL}/class/join/link?token=${token}`,
    //     };
    // }
}