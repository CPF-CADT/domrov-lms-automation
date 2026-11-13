import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from './entities';
import { CreateAssignmentDto, CreateClassDto, CreateSubmissionDto, CreateTeamDto } from './dto';
import { AsyncEvaluationClient, EvaluationClient } from './ai-client';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(AcademicClass) private readonly classes: Repository<AcademicClass>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(TeamMember) private readonly members: Repository<TeamMember>,
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    @InjectRepository(Rubric) private readonly rubrics: Repository<Rubric>,
    @InjectRepository(Resource) private readonly resources: Repository<Resource>,
    @InjectRepository(Submission) private readonly submissions: Repository<Submission>,
    @Inject('EvaluationClient') private readonly evaluationClient: EvaluationClient,
  ) {}

  async createClass(input: CreateClassDto, ownerId: string) {
    let joinCode = ''; let exists = true;
    while (exists) { joinCode = randomBytes(3).toString('hex').toUpperCase(); exists = !!(await this.classes.findOneBy({ joinCode })); }
    const entity = await this.classes.save(this.classes.create({ ...input, ownerId, joinCode, status: 'active' }));
    await this.enrollments.save(this.enrollments.create({ classId: entity.id, userId: ownerId, role: 'teacher', status: 'active' }));
    return this.classView(entity);
  }

  async listClasses(userId: string) {
    const enrollments = await this.enrollments.findBy({ userId, status: 'active' });
    const own = await this.classes.findBy({ ownerId: userId });
    const ids = new Set([...enrollments.map(x => x.classId), ...own.map(x => x.id)]);
    return (await this.classes.find()).filter(x => ids.has(x.id)).map(x => this.classView(x));
  }

  async enroll(classId: string, userId: string) {
    if (!await this.classes.findOneBy({ id: classId })) throw new NotFoundException('Class not found');
    const existing = await this.enrollments.findOneBy({ classId, userId });
    if (existing) throw new ConflictException('User is already enrolled');
    return this.enrollments.save(this.enrollments.create({ classId, userId, role: 'student', status: 'active' }));
  }

  async createTeam(input: CreateTeamDto, actorId: string) {
    await this.requireInstructor(input.classId, actorId);
    const entity = await this.teams.save(this.teams.create({ ...input, maxMembers: input.maxMembers ?? 5 }));
    await this.members.save(this.members.create({ teamId: entity.id, userId: input.leaderId ?? actorId }));
    return entity;
  }

  async addTeamMember(teamId: string, userId: string, actorId: string) {
    const team = await this.teams.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('Team not found');
    await this.requireInstructor(team.classId, actorId);
    const count = await this.members.countBy({ teamId });
    if (count >= team.maxMembers) throw new BadRequestException('Team is full');
    return this.members.save(this.members.create({ teamId, userId }));
  }

  async createAssignment(input: CreateAssignmentDto, actorId: string) {
    await this.requireInstructor(input.classId, actorId);
    const entity = await this.assignments.save(this.assignments.create({ ...input, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, aiEvaluationEnabled: input.aiEvaluationEnabled ?? false }));
    return entity;
  }

  async createSubmission(assignmentId: string, input: CreateSubmissionDto, userId: string) {
    const assignment = await this.assignments.findOneBy({ id: assignmentId });
    if (!assignment) throw new NotFoundException('Assignment not found');
    const enrollment = await this.enrollments.findOneBy({ classId: assignment.classId, userId, status: 'active' });
    if (!enrollment) throw new ForbiddenException('Not enrolled in class');
    if (!await this.resources.findOneBy({ id: input.resourceId })) throw new NotFoundException('Resource not found');
    const submission = await this.submissions.save(this.submissions.create({ assignmentId, resourceId: input.resourceId, language: input.language, teamId: input.teamId, userId, status: 'stored' }));
    if (!assignment.aiEvaluationEnabled) return { submissionId: submission.id, status: 'stored' };
    try {
      const evaluation = await this.evaluationClient.requestEvaluation({ submissionId: submission.id, assignmentId, userId, resourceId: input.resourceId, language: input.language });
      submission.evaluationId = evaluation.evaluationId; submission.status = evaluation.status;
      await this.submissions.save(submission);
      return { submissionId: submission.id, evaluationId: evaluation.evaluationId, status: evaluation.status };
    } catch (error) {
      submission.status = 'pending'; await this.submissions.save(submission);
      return { submissionId: submission.id, status: 'pending' };
    }
  }

  async getSubmission(id: string, userId: string) {
    const submission = await this.submissions.findOneBy({ id, userId });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  private async requireInstructor(classId: string, userId: string) {
    const enrollment = await this.enrollments.findOneBy({ classId, userId, status: 'active' });
    const cls = await this.classes.findOneBy({ id: classId });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.ownerId !== userId && enrollment?.role !== 'teacher') throw new ForbiddenException('Instructor access required');
  }
  private classView(entity: AcademicClass) { return { id: entity.id, name: entity.name, description: entity.description, ownerId: entity.ownerId }; }
}

export { AsyncEvaluationClient };
