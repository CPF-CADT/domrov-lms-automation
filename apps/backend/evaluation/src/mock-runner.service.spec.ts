import { MockRunnerService } from './mock-runner.service';

describe('MockRunnerService', () => {
  it('completes supported local evaluations deterministically', async () => {
    await expect(new MockRunnerService().run({ language: 'typescript' })).resolves.toEqual({ score: 100, feedback: expect.any(String) });
  });

  it('rejects unsupported languages', async () => {
    await expect(new MockRunnerService().run({ language: 'python' })).rejects.toThrow('LANGUAGE_NOT_SUPPORTED');
  });
});
