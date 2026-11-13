import { Injectable } from '@nestjs/common';

export interface RunnerInput { language: string; resourceKey?: string; }
export interface RunnerOutput { score: number; feedback: string; }

@Injectable()
export class MockRunnerService {
  async run(input: RunnerInput): Promise<RunnerOutput> {
    if (!['javascript', 'typescript', 'js', 'ts'].includes(input.language.toLowerCase())) {
      throw new Error('LANGUAGE_NOT_SUPPORTED');
    }
    if (input.resourceKey?.includes('fail')) throw new Error('EVALUATION_FAILED');
    return { score: 100, feedback: 'Evaluation completed by the local NestJS runner.' };
  }
}
