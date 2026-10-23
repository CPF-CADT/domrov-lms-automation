import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { EvaluationController } from '../src/modules/evaluation/evaluation.controller';
import { SubmissionMemberGuard } from '../src/common/security/guards/submission.guard';
import { SubmissionInstructorGuard, SUBMISSION_ID_KEY } from '../src/common/security/guards/submission.guard';
import { SubmissionController } from '../src/modules/assessment/submission.controller';
import { UserRole } from '../src/libs/enums/Role';

describe('submission file viewing access', () => {
  const request = (userId: number, submissionId: number) => ({
    user: { id: userId },
    params: { submission_id: String(submissionId) },
    query: {},
    body: {},
  });

  const executionContext = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
    }) as unknown as ExecutionContext;

  it('keeps both HTTP endpoints behind JWT and submission-member guards', () => {
    for (const handler of [
      EvaluationController.prototype.processSubmission,
      EvaluationController.prototype.getSubmissionFolderStructure,
    ]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
      expect(guards).toEqual(expect.arrayContaining([
        expect.any(Function),
        SubmissionMemberGuard,
      ]));
    }
  });

  it('allows a teacher through the existing submission member guard', async () => {
    const req = request(10, 20);
    const permissionService = {
      getSubmissionContext: jest.fn().mockResolvedValue({
        submissionId: 20,
        userId: 10,
        submissionEntity: {},
        classContext: {
          role: UserRole.Teacher,
          isOwner: true,
        },
      }),
    };
    const guard = new SubmissionMemberGuard(new Reflector(), permissionService as any);

    await expect(guard.canActivate(executionContext(req))).resolves.toBe(true);
    expect(permissionService.getSubmissionContext).toHaveBeenCalledWith(10, 20);
  });

  it('rejects users without submission-class access', async () => {
    const req = request(11, 20);
    const permissionService = {
      getSubmissionContext: jest.fn().mockResolvedValue(null),
    };
    const guard = new SubmissionMemberGuard(new Reflector(), permissionService as any);

    await expect(guard.canActivate(executionContext(req))).rejects.toThrow('Submission not found');
  });

  it('uses submissionId plus instructor permission for feedback updates', () => {
    const handler = SubmissionController.prototype.updateSingleFeedback;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];

    expect(guards).toContain(SubmissionInstructorGuard);
    expect(Reflect.getMetadata(SUBMISSION_ID_KEY, SubmissionController.prototype, 'updateSingleFeedback')).toBe('submissionId');
  });

  it('rejects a student from instructor-only feedback modification', async () => {
    const req = request(11, 20);
    const permissionService = {
      getSubmissionContext: jest.fn().mockResolvedValue({
        submissionId: 20,
        userId: 11,
        submissionEntity: {},
        classContext: { role: UserRole.Student, isOwner: false },
      }),
    };
    const guard = new SubmissionInstructorGuard(new Reflector(), permissionService as any);

    await expect(guard.canActivate(executionContext(req))).rejects.toThrow('Only instructors can perform this action');
  });
});
