import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AcademicService } from '../src/academic.service';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from '../src/entities';

const repository = (overrides: Record<string, unknown> = {}) => ({
  findOneBy: jest.fn(), findBy: jest.fn().mockResolvedValue([]), find: jest.fn().mockResolvedValue([]),
  create: jest.fn((value: any) => value), save: jest.fn(async (value: any) => ({ id: value.id ?? 'generated', ...value })),
  countBy: jest.fn().mockResolvedValue(0), delete: jest.fn(), remove: jest.fn(), ...overrides,
});

async function serviceWith(overrides: Record<string, unknown> = {}) {
  const repos: any = {
    classes: repository(overrides.classes as Record<string, unknown>), enrollments: repository(overrides.enrollments as Record<string, unknown>),
    teams: repository(overrides.teams as Record<string, unknown>), members: repository(overrides.members as Record<string, unknown>),
    assignments: repository(overrides.assignments as Record<string, unknown>), rubrics: repository(overrides.rubrics as Record<string, unknown>),
    resources: repository(overrides.resources as Record<string, unknown>), submissions: repository(overrides.submissions as Record<string, unknown>),
  };
  const repoProviders = [[AcademicClass, repos.classes], [Enrollment, repos.enrollments], [Team, repos.teams], [TeamMember, repos.members],
    [Assignment, repos.assignments], [Rubric, repos.rubrics], [Resource, repos.resources], [Submission, repos.submissions]]
    .map(([token, value]) => ({ provide: getRepositoryToken(token), useValue: value }));
  const module = await Test.createTestingModule({ providers: [AcademicService, { provide: 'EvaluationClient', useValue: { requestEvaluation: jest.fn() } }, ...repoProviders] }).compile();
  return { service: module.get(AcademicService), repos };
}

describe('Academic functional parity', () => {
  it('joins a class by its legacy join code without touching Auth data', async () => {
    const cls = { id: 'class-1', joinCode: 'ABC123', ownerId: 'teacher-1' };
    const { service, repos } = await serviceWith({ classes: { findOneBy: jest.fn().mockResolvedValue(cls) }, enrollments: { findOneBy: jest.fn().mockResolvedValue(undefined) } });
    const result = await service.joinClass({ joinCode: 'abc123' }, 'student-1');
    expect(result).toEqual(expect.objectContaining({ classId: 'class-1', userId: 'student-1', role: 'student' }));
    expect(repos.enrollments.save).toHaveBeenCalled();
  });

  it('publishes an assignment only when its rubric total matches max score', async () => {
    const assignment = { id: 'assignment-1', classId: 'class-1', title: 'Loops', instruction: 'Implement loops', maxScore: 10, isPublic: false };
    const { service, repos } = await serviceWith({
      assignments: { findOneBy: jest.fn().mockResolvedValue(assignment) },
      classes: { findOneBy: jest.fn().mockResolvedValue({ id: 'class-1', ownerId: 'teacher-1' }) },
      enrollments: { findOneBy: jest.fn().mockResolvedValue({ classId: 'class-1', userId: 'teacher-1', status: 'active', role: 'teacher' }) },
      rubrics: { findBy: jest.fn().mockResolvedValue([{ totalScore: 10 }]) },
    });
    const result = await service.publishAssignment('assignment-1', 'teacher-1');
    expect(result.isPublic).toBe(true);
    expect(repos.assignments.save).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
  });

  it('grades a submission through the Academic Service-owned records', async () => {
    const submission = { id: 'submission-1', assignmentId: 'assignment-1', userId: 'student-1', status: 'SUBMITTED' };
    const { service } = await serviceWith({
      submissions: { findOneBy: jest.fn().mockResolvedValue(submission) },
      assignments: { findOneBy: jest.fn().mockResolvedValue({ id: 'assignment-1', classId: 'class-1', maxScore: 100 }) },
      classes: { findOneBy: jest.fn().mockResolvedValue({ id: 'class-1', ownerId: 'teacher-1' }) },
      enrollments: { findOneBy: jest.fn().mockResolvedValue({ classId: 'class-1', userId: 'teacher-1', status: 'active', role: 'teacher' }) },
    });
    const result = await service.grade('submission-1', { score: 85, feedback: 'Good work' }, 'teacher-1');
    expect(result).toEqual(expect.objectContaining({ score: 85, feedback: 'Good work', status: 'GRADED', gradedBy: 'teacher-1' }));
  });
});
