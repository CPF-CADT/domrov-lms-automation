import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from './entities';
import { CreateAssignmentDto, CreateClassDto, CreateSubmissionDto, CreateTeamDto, FeedbackDto, GradeSubmissionDto, JoinClassDto, JoinTeamDto, NotifyUploadDto, RubricDto, UpdateAssignmentDto, UpdateClassDto } from './dto';
import { AsyncEvaluationClient, EvaluationClient } from './ai-client';
import { AcademicStorageService } from './storage';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

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
    @Optional() private readonly storage?: AcademicStorageService,
  ) {}

  async createClass(input: CreateClassDto, ownerId: string) {
    let joinCode = ''; let exists = true;
    while (exists) { joinCode = randomBytes(3).toString('hex').toUpperCase(); exists = !!(await this.classes.findOneBy({ joinCode })); }
    const entity = await this.classes.save(this.classes.create({ ...input, ownerId, joinCode, status: 'active' }));
    await this.enrollments.save(this.enrollments.create({ classId: entity.id, userId: ownerId, role: 'teacher', status: 'active' }));
    const created = await this.classes.findOneByOrFail({ id: entity.id });
    return this.classView(created, 'Teacher');
  }

  async listClasses(userId: string) {
    const enrollments = await this.enrollments.findBy({ userId, status: 'active' });
    const own = await this.classes.findBy({ ownerId: userId });
    const ids = new Set([...enrollments.map(x => x.classId), ...own.map(x => x.id)]);
    return (await this.classes.find()).filter(x => ids.has(x.id)).map(x => this.classView(x, enrollments.find(e => e.classId === x.id)?.role ?? (x.ownerId === userId ? 'teacher' : undefined)));
  }

  async enroll(classId: string, userId: string) {
    if (!await this.classes.findOneBy({ id: classId })) throw new NotFoundException('Class not found');
    const existing = await this.enrollments.findOneBy({ classId, userId });
    if (existing) throw new ConflictException('User is already enrolled');
    return this.enrollments.save(this.enrollments.create({ classId, userId, role: 'student', status: 'active' }));
  }

  async createTeam(input: CreateTeamDto, actorId: string) {
    await this.requireInstructor(input.classId, actorId);
    const teamCode = randomBytes(3).toString('hex').toUpperCase();
    const entity = await this.teams.save(this.teams.create({ ...input, joinCode: teamCode, maxMembers: input.maxMembers ?? 5, leaderId: input.leaderId ?? actorId }));
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
    const entity = await this.assignments.save(this.assignments.create({ ...input, title: input.title ?? 'Untitled assignment', instruction: input.instruction ?? 'Add instructions before publishing.', maxScore: input.maxScore ?? 100, startAt: input.startAt ? new Date(input.startAt) : undefined, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, aiEvaluationEnabled: input.aiEvaluationEnabled ?? false, allowLate: input.allowLate ?? false, submissionType: input.submissionType ?? 'INDIVIDUAL', allowedSubmissionMethod: input.allowedSubmissionMethod ?? 'ANY', isPublic: input.isPublic ?? false }));
    if (input.rubrics?.length) await this.replaceRubrics(entity.id, input.rubrics);
    return entity;
  }

  async updateClass(id: string, input: UpdateClassDto, actorId: string) {
    const entity = await this.classes.findOneBy({ id }); if (!entity) throw new NotFoundException('Class not found');
    await this.requireInstructor(id, actorId); Object.assign(entity, input); return this.classes.save(entity);
  }

  async deleteClass(id: string, actorId: string) { const entity = await this.classes.findOneBy({ id }); if (!entity) throw new NotFoundException('Class not found'); if (entity.ownerId !== actorId) throw new ForbiddenException('Owner access required'); await this.classes.remove(entity); return { message: 'Class deleted successfully' }; }

  async joinClass(input: JoinClassDto, userId: string) { const cls = await this.classes.findOneBy({ joinCode: input.joinCode.toUpperCase() }); if (!cls) throw new NotFoundException('Class not found'); const existing = await this.enrollments.findOneBy({ classId: cls.id, userId }); if (existing) return existing; return this.enrollments.save(this.enrollments.create({ classId: cls.id, userId, role: 'student', status: 'active' })); }
  async listStudents(classId: string, actorId: string) { await this.requireMember(classId, actorId); return this.enrollments.findBy({ classId, status: 'active' }); }
  async listTeams(classId: string, actorId: string) { await this.requireMember(classId, actorId); return this.teams.findBy({ classId }); }
  async getTeam(id: string, actorId: string) { const team = await this.teams.findOneBy({ id }); if (!team) throw new NotFoundException('Team not found'); await this.requireMember(team.classId, actorId); const members = await this.members.findBy({ teamId: id }); return { ...team, members }; }
  async joinTeam(input: JoinTeamDto, userId: string) { const team = await this.teams.findOneBy({ joinCode: input.joinCode.toUpperCase() }); if (!team) throw new NotFoundException('Team not found'); await this.requireMember(team.classId, userId); const existing = await this.members.findOneBy({ teamId: team.id, userId }); if (existing) return existing; if (await this.members.countBy({ teamId: team.id }) >= team.maxMembers) throw new ConflictException('Team is full'); return this.members.save(this.members.create({ teamId: team.id, userId })); }
  async removeTeamMember(teamId: string, memberId: string, actorId: string) { const team = await this.teams.findOneBy({ id: teamId }); if (!team) throw new NotFoundException('Team not found'); if (team.leaderId !== actorId) throw new ForbiddenException('Only the team leader can remove members'); const member = await this.members.findOneBy({ teamId, userId: memberId }); if (!member) throw new NotFoundException('Team member not found'); await this.members.remove(member); return { message: 'Team member removed successfully' }; }
  async deleteTeam(teamId: string, actorId: string) { const team = await this.teams.findOneBy({ id: teamId }); if (!team) throw new NotFoundException('Team not found'); if (team.leaderId !== actorId) throw new ForbiddenException('Only the team leader can delete the team'); await this.teams.remove(team); return { message: 'Team deleted successfully' }; }

  async listAssignments(classId: string, actorId: string, session?: number) { await this.requireMember(classId, actorId); const rows = await this.assignments.find({ where: session === undefined ? { classId } : { classId, session }, order: { dueAt: 'ASC' } }); return rows.map(x => this.assignmentView(x)); }
  async assignmentTracking(id: string, actorId: string) { const assignment = await this.assignments.findOneBy({ id }); if (!assignment) throw new NotFoundException('Assignment not found'); await this.requireInstructor(assignment.classId, actorId); return (await this.submissions.findBy({ assignmentId: id })).map(s => ({ submissionId: s.id, userId: Number(s.userId), studentId: Number(s.userId), name: `Student ${s.userId}`, status: s.status, score: s.score, feedback: s.feedback })); }
  async assignmentStats(id: string, actorId: string) { const rows = await this.assignmentTracking(id, actorId); const scored = rows.filter(row => row.score !== null && row.score !== undefined); return { total: rows.length, submitted: rows.filter(row => row.status === 'SUBMITTED' || row.status === 'GRADED').length, graded: rows.filter(row => row.status === 'GRADED').length, averageScore: scored.length ? scored.reduce((sum, row) => sum + Number(row.score), 0) / scored.length : 0 }; }
  async getAssignment(id: string, actorId: string) { const assignment = await this.assignments.findOneBy({ id }); if (!assignment) throw new NotFoundException('Assignment not found'); await this.requireMember(assignment.classId, actorId); const rubrics = await this.rubrics.findBy({ assignmentId: id }); const resources = await this.resources.findBy({ ownerId: actorId }); return { ...this.assignmentView(assignment), rubrics, resources }; }
  async updateAssignment(id: string, input: UpdateAssignmentDto, actorId: string) { const assignment = await this.assignments.findOneBy({ id }); if (!assignment) throw new NotFoundException('Assignment not found'); await this.requireInstructor(assignment.classId, actorId); const { rubrics, ...data } = input; Object.assign(assignment, { ...data, startAt: data.startAt ? new Date(data.startAt) : assignment.startAt, dueAt: data.dueAt ? new Date(data.dueAt) : assignment.dueAt }); const saved = await this.assignments.save(assignment); if (rubrics) await this.replaceRubrics(id, rubrics); return this.getAssignment(id, actorId); }
  async publishAssignment(id: string, actorId: string) { const assignment = await this.assignments.findOneBy({ id }); if (!assignment) throw new NotFoundException('Assignment not found'); await this.requireInstructor(assignment.classId, actorId); if (!assignment.title.trim() || !assignment.instruction.trim() || Number(assignment.maxScore) <= 0) throw new BadRequestException('Title, instruction, and positive max score are required'); const rubrics = await this.rubrics.findBy({ assignmentId: id }); if (rubrics.length && rubrics.reduce((n, r) => n + Number(r.totalScore), 0) !== Number(assignment.maxScore)) throw new BadRequestException('Rubric total score must equal maxScore'); assignment.isPublic = true; return this.assignments.save(assignment); }
  async deleteAssignment(id: string, actorId: string) { const assignment = await this.assignments.findOneBy({ id }); if (!assignment) throw new NotFoundException('Assignment not found'); await this.requireInstructor(assignment.classId, actorId); await this.assignments.remove(assignment); return { message: 'Assignment deleted successfully' }; }
  async replaceRubrics(assignmentId: string, input: RubricDto[]) { await this.rubrics.delete({ assignmentId }); return this.rubrics.save(input.map(x => this.rubrics.create({ assignmentId, definition: x.definition ?? x.criterion ?? '', criterion: x.criterion, totalScore: x.totalScore }))); }

  async saveDraft(assignmentId: string, input: CreateSubmissionDto, userId: string) { return this.saveSubmission(assignmentId, input, userId, 'DRAFT'); }
  async submitAssignment(assignmentId: string, input: CreateSubmissionDto, userId: string) { return this.saveSubmission(assignmentId, input, userId, 'SUBMITTED'); }
  private async saveSubmission(assignmentId: string, input: CreateSubmissionDto, userId: string, status: string) { const assignment = await this.assignments.findOneBy({ id: assignmentId }); if (!assignment) throw new NotFoundException('Assignment not found'); await this.requireMember(assignment.classId, userId); let submission = await this.submissions.findOneBy({ assignmentId, userId }); if (!submission) submission = this.submissions.create({ assignmentId, userId, resourceId: input.resourceId ?? undefined as any, language: input.language, teamId: input.teamId, comments: input.comments, status }); else Object.assign(submission, { resourceId: input.resourceId ?? submission.resourceId, language: input.language ?? submission.language, teamId: input.teamId ?? submission.teamId, comments: input.comments ?? submission.comments, status }); if (status === 'SUBMITTED') submission.submittedAt = new Date(); const saved = await this.submissions.save(submission); if (status === 'SUBMITTED' && assignment.aiEvaluationEnabled && input.resourceId) { try { const evaluation = await this.evaluationClient.requestEvaluation({ submissionId: saved.id, assignmentId, userId, resourceId: input.resourceId, language: input.language }); saved.evaluationId = evaluation.evaluationId; saved.status = evaluation.status; await this.submissions.save(saved); } catch { saved.status = 'PENDING'; await this.submissions.save(saved); } } return { submissionId: saved.id, status: saved.status }; }
  async unsubmit(id: string, userId: string) { const s = await this.submissions.findOneBy({ id, userId }); if (!s) throw new NotFoundException('Submission not found'); s.status = 'DRAFT'; s.submittedAt = undefined; return this.submissions.save(s); }
  async myStatus(assignmentId: string, userId: string) { const s = await this.submissions.findOneBy({ assignmentId, userId }); return s ?? { assignmentId, userId, status: 'PENDING' }; }
  async myStatusInClass(classId: string, userId: string) {
    await this.requireMember(classId, userId);
    const assignments = await this.assignments.find({ where: { classId }, order: { dueAt: 'ASC' } });
    const submissions = await this.submissions.findBy({ userId: String(userId) });
    const submissionsByAssignment = new Map(submissions.map((submission) => [submission.assignmentId, submission]));

    return assignments.map((assignment) => {
      const submission = submissionsByAssignment.get(assignment.id);
      return {
        assessmentId: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueAt ?? null,
        status: submission?.status ?? 'PENDING',
        submissionId: submission?.id ?? null,
        grade: submission?.score == null ? null : Number(submission.score),
      };
    });
  }
  async grade(id: string, input: GradeSubmissionDto, actorId: string) { const s = await this.submissions.findOneBy({ id }); if (!s) throw new NotFoundException('Submission not found'); const a = await this.assignments.findOneBy({ id: s.assignmentId }); if (!a) throw new NotFoundException('Assignment not found'); await this.requireInstructor(a.classId, actorId); if (input.score < 0 || input.score > Number(a.maxScore)) throw new BadRequestException('Score is outside assignment range'); Object.assign(s, { score: input.score, feedback: input.feedback, gradedBy: actorId, status: 'GRADED' }); return this.submissions.save(s); }
  async addFeedback(id: string, input: FeedbackDto, actorId: string) { return this.grade(id, { score: Number((await this.submissions.findOneBy({ id }))?.score ?? 0), feedback: input.feedback }, actorId); }
  async getSubmissionForUser(id: string, userId: string) { const actorId = String(userId); const s = await this.submissions.findOneBy({ id }); if (!s) throw new NotFoundException('Submission not found'); const a = await this.assignments.findOneBy({ id: s.assignmentId }); if (!a) throw new NotFoundException('Assignment not found'); if (String(s.userId) !== actorId) await this.requireInstructor(a.classId, actorId); return s; }

  async getDashboardStats() {
    const [classes, enrollments, assignments, submissions] = await Promise.all([
      this.classes.find(), this.enrollments.find(), this.assignments.find(), this.submissions.find(),
    ]);
    const statusCounts = submissions.reduce<Record<string, number>>((counts, submission) => {
      counts[submission.status] = (counts[submission.status] ?? 0) + 1;
      return counts;
    }, {});
    const scored = submissions.filter((submission) => submission.score !== null && submission.score !== undefined);
    const averageScore = scored.length === 0 ? null : Number((scored.reduce((sum, submission) => sum + Number(submission.score), 0) / scored.length).toFixed(2));
    return {
      classes: classes.length,
      activeClasses: classes.filter((item) => item.status === 'active').length,
      enrollments: enrollments.filter((item) => item.status === 'active').length,
      assignments: assignments.length,
      submissions: submissions.length,
      evaluations: submissions.filter((item) => Boolean(item.evaluationId)).length,
      scoredSubmissions: scored.length,
      averageScore,
      submissionsByStatus: statusCounts,
    };
  }

  async listEvaluationResults(filters: { status?: string; assignmentId?: string; userId?: string; limit?: number } = {}) {
    const rows = (await this.submissions.find())
      .filter((submission) => Boolean(submission.evaluationId))
      .filter((submission) => !filters.status || submission.status === filters.status)
      .filter((submission) => !filters.assignmentId || submission.assignmentId === filters.assignmentId)
      .filter((submission) => !filters.userId || submission.userId === filters.userId)
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
      .slice(0, Math.min(Math.max(filters.limit ?? 100, 1), 500));
    return Promise.all(rows.map(async (submission) => ({
      ...submission,
      assignment: await this.assignments.findOneBy({ id: submission.assignmentId }),
    })));
  }

  async getEvaluationResult(id: string) {
    const submission = await this.submissions.findOneBy({ id });
    if (!submission || !submission.evaluationId) throw new NotFoundException('Evaluation result not found');
    const assignment = await this.assignments.findOneBy({ id: submission.assignmentId });
    return { ...submission, assignment };
  }

  async uploadResource(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }, input: NotifyUploadDto, ownerId: string) {
    if (!file?.buffer?.length) throw new BadRequestException('File is required');
    const filename = file.originalname.trim();
    if (!filename || filename.includes('\0') || /[\\/]/.test(filename)) throw new BadRequestException('Invalid filename');
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = input.key || `${ownerId}/${input.resourceType ?? 'resource'}/${input.resourceId ?? 'pending'}/${safeFilename}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    if (!this.storage) throw new Error('Academic storage is not configured');
    await this.storage.save(key, Readable.from(file.buffer), { key, contentType: file.mimetype, size: file.size });
    return this.persistStoredResource({ key, filename, contentType: file.mimetype, size: file.size, checksum }, ownerId);
  }

  async createResource(input: NotifyUploadDto, ownerId: string) {
    if (/^https?:\/\//i.test(input.key)) {
      const resource = this.resources.create({ title: input.filename, url: input.key, ownerId, type: 'url', contentType: 'text/uri-list', storageProvider: 'external' });
      return this.resources.save(resource);
    }
    if (!this.storage || !(await this.storage.exists(input.key))) throw new NotFoundException('File not found in storage');
    const metadata = await this.storage.head(input.key);
    return this.persistStoredResource({ key: input.key, filename: input.filename, contentType: input.contentType ?? metadata.contentType, size: metadata.size }, ownerId);
  }

  private async persistStoredResource(input: { key: string; filename: string; contentType?: string; size?: number; checksum?: string }, ownerId: string) {
    let resource = await this.resources.findOneBy({ url: input.key });
    const data = { title: input.filename, url: input.key, ownerId, type: this.resourceType(input.filename), contentType: input.contentType, size: input.size, storageProvider: this.storage?.provider ?? 'local' };
    if (resource) Object.assign(resource, data);
    else resource = this.resources.create(data);
    return this.resources.save(resource);
  }

  async getResource(id: string, userId: string) {
    const resource = await this.resources.findOneBy({ id });
    if (!resource) throw new NotFoundException('Resource not found');
    await this.requireMemberByResource(resource, userId);
    return resource;
  }

  async getResourceStream(id: string, userId: string) {
    const resource = await this.getResource(id, userId);
    return this.streamResource(resource);
  }

  /**
   * Loads a submission resource after applying submission/assignment
   * authorization. This is intentionally separate from getResource(), whose
   * ownership rule is correct for generic resources but too narrow for a
   * teacher reviewing a student's submission.
   */
  async getSubmissionResource(submissionId: string, userId: string) {
    const submission = await this.getSubmissionForUser(submissionId, userId);
    const resource = await this.resources.findOneBy({ id: submission.resourceId });
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async getSubmissionResourceStream(submissionId: string, userId: string) {
    const resource = await this.getSubmissionResource(submissionId, userId);
    return this.streamResource(resource);
  }

  private async streamResource(resource: Resource) {
    if (resource.storageProvider === 'external' || resource.type === 'url') throw new NotFoundException('External resources cannot be downloaded as files');
    if (!this.storage) throw new NotFoundException('Storage is not configured');
    const file = await this.storage.stream(resource.url).catch(() => { throw new NotFoundException('File not found in storage'); });
    return { ...file, filename: resource.title, contentType: resource.contentType ?? file.contentType };
  }

  async presignedResource(input: NotifyUploadDto, userId: string) {
    if (!input.filename || !input.contentType) throw new BadRequestException('Filename and content type are required');
    const filename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = input.key || `${userId}/${input.resourceType ?? 'resource'}/${input.resourceId ?? 'pending'}/${filename}`;
    if (!this.storage) throw new NotFoundException('Storage is not configured');
    return { presignedUrl: await this.storage.createUploadUrl(key, input.contentType), key, provider: this.storage.provider, expiresIn: this.storage.provider === 'r2' ? 300 : undefined };
  }

  cloudinaryUploadParams() {
    if (!this.storage) throw new NotFoundException('Storage is not configured');
    return this.storage.createCloudinaryUploadParams();
  }

  private resourceType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext ?? '')) return 'image';
    if (['mp4', 'mov', 'avi'].includes(ext ?? '')) return 'video';
    if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'java', 'js', 'py', 'zip'].includes(ext ?? '')) return 'document';
    return 'file';
  }

  async createSubmission(assignmentId: string, input: CreateSubmissionDto, userId: string) {
    const assignment = await this.assignments.findOneBy({ id: assignmentId });
    if (!assignment) throw new NotFoundException('Assignment not found');
    const enrollment = await this.enrollments.findOneBy({ classId: assignment.classId, userId, status: 'active' });
    if (!enrollment) throw new ForbiddenException('Not enrolled in class');
    if (!input.resourceId || !await this.resources.findOneBy({ id: input.resourceId })) throw new NotFoundException('Resource not found');
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
  private async requireMember(classId: string, userId: string) { const actorId = String(userId); const cls = await this.classes.findOneBy({ id: classId }); if (!cls) throw new NotFoundException('Class not found'); if (String(cls.ownerId) === actorId) return; const enrollment = await this.enrollments.findOneBy({ classId, userId: actorId, status: 'active' }); if (!enrollment) throw new ForbiddenException('Class membership required'); }
  private async requireMemberByResource(resource: Resource, userId: string) { if (resource.ownerId === userId) return; const submissions = await this.submissions.findBy({ resourceId: resource.id }); if (!submissions.some(s => s.userId === userId)) throw new ForbiddenException('Resource access denied'); }
  private assignmentView(x: Assignment) { return { ...x, dueDate: x.dueAt, startDate: x.startAt, aiEvaluationEnable: x.aiEvaluationEnabled }; }
  private classView(entity: AcademicClass, role?: string) { return { id: entity.id, name: entity.name, description: entity.description, ownerId: entity.ownerId, joinCode: entity.joinCode, role: role === 'teacher' ? 'Teacher' : role === 'student' ? 'Student' : role }; }
}

export { AsyncEvaluationClient };
