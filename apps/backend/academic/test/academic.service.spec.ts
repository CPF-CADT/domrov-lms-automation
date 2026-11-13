import { Test } from '@nestjs/testing';
import { AcademicService } from '../src/academic.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from '../src/entities';

const repo = () => ({ findOneBy: jest.fn(), find: jest.fn().mockResolvedValue([]), create: jest.fn((x: any) => x), save: jest.fn(async (x: any) => ({ id: x.id ?? 'generated-id', ...x })), countBy: jest.fn().mockResolvedValue(0) });
describe('AcademicService', () => {
  it('persists a submission before requesting asynchronous evaluation', async () => {
    const submissions = repo(); const evaluation = { requestEvaluation: jest.fn().mockResolvedValue({ evaluationId: 'eval-1', status: 'queued' }) };
    const assignment = { id: 'a1', classId: 'c1', aiEvaluationEnabled: true };
    const enrollment = { ...repo(), findOneBy: jest.fn().mockResolvedValue({ classId: 'c1', userId: 'u1', status: 'active' }) };
    const module = await Test.createTestingModule({ providers: [AcademicService, { provide: 'EvaluationClient', useValue: evaluation }, ...[[AcademicClass, repo()], [Enrollment, enrollment], [Team, repo()], [TeamMember, repo()], [Assignment, { ...repo(), findOneBy: jest.fn().mockResolvedValue(assignment) }], [Rubric, repo()], [Resource, { ...repo(), findOneBy: jest.fn().mockResolvedValue({ id: 'r1' }) }], [Submission, submissions]].map(([token, value]) => ({ provide: getRepositoryToken(token as any), useValue: value }))] }).compile();
    const service = module.get(AcademicService);
    const result = await service.createSubmission('a1', { resourceId: 'r1', language: 'python' }, 'u1');
    expect(submissions.save).toHaveBeenCalled(); expect(evaluation.requestEvaluation).toHaveBeenCalledWith(expect.objectContaining({ submissionId: 'generated-id' })); expect(result.status).toBe('queued');
  });

  it('returns pending when the AI boundary is unavailable after persistence', async () => {
    const submissions = repo(); const evaluation = { requestEvaluation: jest.fn().mockRejectedValue(new Error('offline')) };
    const module = await Test.createTestingModule({ providers: [AcademicService, { provide: 'EvaluationClient', useValue: evaluation }, ...[[AcademicClass, repo()], [Enrollment, { ...repo(), findOneBy: jest.fn().mockResolvedValue({ classId: 'c1', userId: 'u1', status: 'active' }) }], [Team, repo()], [TeamMember, repo()], [Assignment, { ...repo(), findOneBy: jest.fn().mockResolvedValue({ id: 'a1', classId: 'c1', aiEvaluationEnabled: true }) }], [Rubric, repo()], [Resource, { ...repo(), findOneBy: jest.fn().mockResolvedValue({ id: 'r1' }) }], [Submission, submissions]].map(([token, value]) => ({ provide: getRepositoryToken(token as any), useValue: value }))] }).compile();
    const result = await module.get(AcademicService).createSubmission('a1', { resourceId: 'r1' }, 'u1');
    expect(result.status).toBe('pending'); expect(submissions.save).toHaveBeenCalledTimes(2);
  });
});
