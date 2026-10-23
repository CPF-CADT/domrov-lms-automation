import { ClassService } from '../src/modules/class/class.service';
import { SubmissionType } from '../src/libs/enums/Assessment';

describe('ClassService late enrollment submissions', () => {
  it('creates missing submissions only for published individual assessments', async () => {
    const service = Object.create(ClassService.prototype) as any;
    service.classRepository = {
      findOne: jest.fn().mockResolvedValue({
        assessments: [
          { id: 10, isPublic: true, submissionType: SubmissionType.INDIVIDUAL },
          { id: 20, isPublic: true, submissionType: SubmissionType.TEAM },
          { id: 30, isPublic: false, submissionType: SubmissionType.INDIVIDUAL },
        ],
      }),
    };
    service.submissionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
    };

    await service.createMissingIndividualSubmissions(3, 7);

    expect(service.classRepository.findOne).toHaveBeenCalledWith({
      where: { id: 3 },
      relations: ['assessments'],
    });
    expect(service.submissionRepository.save).toHaveBeenCalledTimes(1);
    expect(service.submissionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      assessment: { id: 10 },
      user: { id: 7 },
      attemptNumber: 0,
    }));
  });
});
