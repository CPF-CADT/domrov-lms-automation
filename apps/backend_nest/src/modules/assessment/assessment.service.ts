import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

// Entities
import { Assessment } from '../../../libs/entities/assessment.entity';
import { Submission } from '../../../libs/entities/submission.entity';
import { SubmissionResource } from '../../../libs/entities/submission-resource.entity';
import { Resource } from '../../../libs/entities/resource.entity';
import { AssessmentResource } from '../../../libs/entities/assessment-resource.entity';
import { Evaluation } from '../../../libs/entities/evaluation.entity';
import { Class } from '../../../libs/entities/class.entity';
import { User } from '../../../libs/entities/user.entity';
import { Team } from '../../../libs/entities/team.entity';
import { Enrollment } from '../../../libs/entities/enrollment.entity';

// Enums & DTOs
import { SubmissionStatus } from '../../../libs/enums/Status';
import { ResourceType } from '../../../libs/enums/Resource';
import { CreateAssessmentDTO } from '../../../libs/dtos/assessment/create-assessment.dto';
import { GradeSubmissionDTO } from '../../../libs/dtos/submission/grade-submission.dto';
import { FileService } from '../file/file.service';
import { UpdateAssessmentDTO } from '../../../libs/dtos/assessment/update-assessment.dto';

@Injectable()
export class AssessmentService {
    constructor(
        @InjectRepository(Assessment) private assessmentRepo: Repository<Assessment>,
        @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
        @InjectRepository(Resource) private resourceRepo: Repository<Resource>,
        @InjectRepository(SubmissionResource) private subResourceRepo: Repository<SubmissionResource>,
        @InjectRepository(AssessmentResource) private assessResRepo: Repository<AssessmentResource>,
        @InjectRepository(Evaluation) private evaluationRepo: Repository<Evaluation>,
        @InjectRepository(Class) private classRepo: Repository<Class>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
        private fileService: FileService,
    ) { }

    // --- 1. Create Assessment ---
    async createAssessment(userId: number, dto: CreateAssessmentDTO, files?: Array<Express.Multer.File>) {
        const classEntity = await this.classRepo.findOne({
            where: { id: dto.classId },
            relations: ['owner'],
        });

        if (!classEntity) throw new NotFoundException('Class not found');
        if (classEntity.owner.id !== userId) throw new BadRequestException('Unauthorized');

        const assessment = await this.assessmentRepo.save({
            ...dto,
            class: classEntity,
        });

        // Handle Instructor Resources
        if (files && files.length > 0) {
            for (const file of files) {
                const url = await this.fileService.mockUploadFile(file);
                const resource = await this.resourceRepo.save({
                    title: file.originalname,
                    type: ResourceType.FILE,
                    url: url,
                    owner: `Instructor:${userId}`,
                });
                await this.assessResRepo.save({ assessment, resource });
            }
        }

        return assessment;
    }

    // --- 2. Submit Assignment (Handles Teams & Multiple Files) ---
    async submitAssignment(
        userId: number,
        assessmentId: number,
        files: Array<Express.Multer.File>,
    ) {
        const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId }, relations: ['class'] });
        if (!assessment) throw new NotFoundException('Assessment not found');

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // -- TEAM LOGIC --
        let team;
        if (assessment.allowTeamSubmition) {
            // Find the team this user belongs to in this class
            team = await this.teamRepo.findOne({
                where: {
                    class: { id: assessment.class.id },
                    members: { user: { id: userId } }
                }
            });

            if (!team) throw new BadRequestException('This is a team assignment, but you are not in a team.');
        }

        // -- STATUS LOGIC --
        const now = new Date();
        let status = SubmissionStatus.SUBMITTED;
        if (now > assessment.dueDate) {
            if (!assessment.allowLate) throw new BadRequestException('Late submissions are not allowed.');
            status = SubmissionStatus.LATE;
        }

        // -- FIND EXISTING SUBMISSION --
        // If team, check by TeamID. If individual, check by UserID.
        let submission = await this.submissionRepo.findOne({
            where: assessment.allowTeamSubmition
                ? { assessment: { id: assessmentId }, team: { id: team.id } }
                : { assessment: { id: assessmentId }, user: { id: userId } }
        });

        if (submission) {
            // Resubmission Logic
            submission.submissionTime = now;
            submission.status = status === SubmissionStatus.LATE ? SubmissionStatus.LATE : SubmissionStatus.RESUBMITTED;
            submission.attemptNumber += 1;
            // Update the user who made the specific edit
            submission.user = user;
        } else {
            // New Submission Logic
            submission = this.submissionRepo.create({
                assessment,
                submissionTime: now,
                status,
                user: user, // The specific student who clicked "Submit"
                team: team, // Null if individual
            });
        }

        const savedSubmission = await this.submissionRepo.save(submission);

        // -- HANDLE FILES --
        if (files && files.length > 0) {
            for (const file of files) {
                const url = await this.fileService.mockUploadFile(file);
                const resource = await this.resourceRepo.save({
                    title: file.originalname,
                    type: ResourceType.FILE,
                    url: url,
                    owner: user.email,
                });
                await this.subResourceRepo.save({ submission: savedSubmission, resource });
            }
        }

        return { message: 'Submitted successfully', submissionId: savedSubmission.id };
    }

    // --- 3. Grade Submission ---
    async gradeSubmission(teacherId: number, submissionId: number, dto: GradeSubmissionDTO) {
        const submission = await this.submissionRepo.findOne({
            where: { id: submissionId },
            relations: ['evaluation']
        });

        if (!submission) throw new NotFoundException('Submission not found');

        let evaluation = submission.evaluation;
        if (!evaluation) {
            evaluation = this.evaluationRepo.create({ submission });
        }

        evaluation.score = dto.score;
        evaluation.feedback = dto.feedback;
        await this.evaluationRepo.save(evaluation);

        submission.status = SubmissionStatus.GRADED;
        await this.submissionRepo.save(submission);

        return evaluation;
    }

    // --- 4. Get Tracking (Roster View) ---
    async getTracking(assessmentId: number) {
        const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId }, relations: ['class'] });
        if (!assessment) throw new NotFoundException('Assessment not found');

        const submissions = await this.submissionRepo.find({
            where: { assessment: { id: assessmentId } },
            relations: ['user', 'team', 'evaluation']
        });

        // Strategy A: Team Tracking
        if (assessment.allowTeamSubmition) {
            const teams = await this.teamRepo.find({ where: { class: { id: assessment.class.id } } });

            return teams.map(team => {
                const sub = submissions.find(s => s.team?.id === team.id);
                return {
                    teamId: team.id,
                    name: team.name,
                    status: sub ? (sub.evaluation ? 'GRADED' : sub.status) : 'NOT_SUBMITTED',
                    score: sub?.evaluation?.score || null
                };
            });
        }

        // Strategy B: Individual Tracking
        else {
            const enrollments = await this.enrollmentRepo.find({ where: { class: { id: assessment.class.id } }, relations: ['user'] });

            return enrollments.map(enrollment => {
                const sub = submissions.find(s => s.user?.id === enrollment.user.id);
                return {
                    studentId: enrollment.user.id,
                    name: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
                    status: sub ? (sub.evaluation ? 'GRADED' : sub.status) : 'NOT_SUBMITTED',
                    score: sub?.evaluation?.score || null
                };
            });
        }
    }

    /**
   * 5. Get All Assignments for a Class (Dashboard View)
   * Sorted by Due Date (soonest first)
   */
    async findAllByClass(classId: number) {
        return await this.assessmentRepo.find({
            where: { class: { id: classId } },
            order: { dueDate: 'ASC' },
            relations: ['resources', 'resources.resource'] // Show attached PDFs/Files
        });
    }

    /**
     * 6. Get Single Assessment Details
     * (Student clicks on assignment to see instructions)
     */
    async findOne(assessmentId: number) {
        const assessment = await this.assessmentRepo.findOne({
            where: { id: assessmentId },
            relations: ['resources', 'resources.resource', 'class']
        });
        if (!assessment) throw new NotFoundException('Assessment not found');
        return assessment;
    }

    /**
     * 7. UPDATE Assessment
     * Teacher edits instructions or extends deadline
     */
    async updateAssessment(userId: number, assessmentId: number, dto: UpdateAssessmentDTO) {
        const assessment = await this.assessmentRepo.findOne({
            where: { id: assessmentId },
            relations: ['class', 'class.owner']
        });

        if (!assessment) throw new NotFoundException('Assessment not found');
        if (assessment.class.owner.id !== userId) throw new BadRequestException('Unauthorized');

        // Update fields
        Object.assign(assessment, dto);

        return await this.assessmentRepo.save(assessment);
    }

    /**
     * 8. DELETE Assessment
     * Teacher removes assignment. 
     * (Ideally soft-delete, but hard-delete here for simplicity)
     */
    async deleteAssessment(userId: number, assessmentId: number) {
        const assessment = await this.assessmentRepo.findOne({
            where: { id: assessmentId },
            relations: ['class', 'class.owner']
        });

        if (!assessment) throw new NotFoundException('Assessment not found');
        if (assessment.class.owner.id !== userId) throw new BadRequestException('Unauthorized');

        // Optional: Check if students have already submitted?
        // const count = await this.submissionRepo.count({ where: { assessment: { id: assessmentId } } });
        // if (count > 0) throw new BadRequestException('Cannot delete assignment with existing submissions');

        return await this.assessmentRepo.remove(assessment);
    }

    /**
     * 9. GET STUDENT SUBMISSION STATUS (The "Sync" Logic)
     * This handles the Team Synchronization.
     */
    async getMySubmission(userId: number, assessmentId: number) {
        const assessment = await this.assessmentRepo.findOne({
            where: { id: assessmentId },
            relations: ['class']
        });
        if (!assessment) throw new NotFoundException('Assessment not found');

        let whereCondition: any = {};

        // --- TEAM SYNC LOGIC ---
        if (assessment.allowTeamSubmition) {
            // 1. Find user's team in this class
            const team = await this.teamRepo.findOne({
                where: {
                    class: { id: assessment.class.id },
                    members: { user: { id: userId } }
                }
            });

            if (!team) {
                // User is not in a team yet, so they definitely haven't submitted
                return { status: SubmissionStatus.PENDING, message: 'Not in a team' };
            }

            // 2. Look for submission by TEAM ID (not User ID)
            whereCondition = { assessment: { id: assessmentId }, team: { id: team.id } };
        } else {
            // --- INDIVIDUAL LOGIC ---
            whereCondition = { assessment: { id: assessmentId }, user: { id: userId } };
        }

        // Fetch submission
        const submission = await this.submissionRepo.findOne({
            where: whereCondition,
            relations: ['resources', 'resources.resource', 'evaluation']
        });

        if (!submission) {
            return { status: SubmissionStatus.PENDING, resources: [] };
        }

        return submission;
        // If Team A submits, User B (who is in Team A) calls this, 
        // logic finds Team A's submission, and returns it. Sync complete.
    }
    async getAssignmentRoster(assessmentId: number) {
        const assessment = await this.assessmentRepo.findOne({
            where: { id: assessmentId },
            relations: ['class']
        });
        if (!assessment) throw new NotFoundException('Assessment not found');

        // 1. Fetch all submissions for this assessment
        const submissions = await this.submissionRepo.find({
            where: { assessment: { id: assessmentId } },
            relations: ['user', 'team', 'evaluation']
        });

        // --- CASE A: TEAM ASSIGNMENT ---
        if (assessment.allowTeamSubmition) {
            // Fetch all teams in the class
            const teams = await this.teamRepo.find({
                where: { class: { id: assessment.class.id } },
                relations: ['members', 'members.user'] // Need members to show teacher who is in the team
            });

            return teams.map(team => {
                // Find if this team has a submission
                const sub = submissions.find(s => s.team?.id === team.id);

                return {
                    type: 'TEAM',
                    id: team.id,
                    name: team.name, // "Team Alpha"
                    members: team.members.map(m => ({
                        userId: m.user.id,
                        fullName: `${m.user.firstName} ${m.user.lastName}`,
                        profileUrl: m.user.profilePictureUrl
                    })),
                    status: sub ? sub.status : 'NOT_SUBMITTED', // This is what you asked for
                    submissionId: sub?.id || null,
                    score: sub?.evaluation?.score || null,
                    submittedAt: sub?.submissionTime || null
                };
            });
        }

        // --- CASE B: INDIVIDUAL ASSIGNMENT ---
        else {
            // Fetch all students enrolled in the class
            const enrollments = await this.enrollmentRepo.find({
                where: { class: { id: assessment.class.id } },
                relations: ['user']
            });

            return enrollments.map(enrollment => {
                const student = enrollment.user;
                // Find if this specific student has a submission
                const sub = submissions.find(s => s.user?.id === student.id);

                return {
                    type: 'INDIVIDUAL',
                    id: student.id,
                    name: `${student.firstName} ${student.lastName}`,
                    email: student.email,
                    profileUrl: student.profilePictureUrl,
                    status: sub ? sub.status : 'NOT_SUBMITTED', // <--- Logic here
                    submissionId: sub?.id || null,
                    score: sub?.evaluation?.score || null,
                    submittedAt: sub?.submissionTime || null
                };
            });
        }
    }

    /**
     * GET DASHBOARD STATS (Optional but useful)
     * Returns: { total: 30, submitted: 15, graded: 5 }
     */
    async getAssessmentStats(assessmentId: number) {
        const roster = await this.getAssignmentRoster(assessmentId);

        const total = roster.length;
        const submitted = roster.filter(r => r.status !== 'NOT_SUBMITTED').length;
        const graded = roster.filter(r => r.status === 'GRADED' || r.status === 'EVALUATED').length;

        return {
            totalStudentsOrTeams: total,
            submittedCount: submitted,
            pendingCount: total - submitted,
            gradedCount: graded
        };
    }
}