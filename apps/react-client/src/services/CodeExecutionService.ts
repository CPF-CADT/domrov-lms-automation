import axiosInstance from '@/lib/AxiosInstance';

export interface ExecutionProjectFile { path: string; content: string; }
export interface ExecutionResult {
  executionId: string;
  status: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  errorCode?: string;
  durationMs?: number;
}

export async function startCodeExecution(input: {
  submissionId: string | number;
  language: string;
  command: string;
  stdin?: string;
  files: ExecutionProjectFile[];
}): Promise<{ executionId: string; status: string }> {
  const response = (await axiosInstance.post('/executions', input)).data;
  return response.data ?? response;
}

export async function getCodeExecution(executionId: string): Promise<ExecutionResult> {
  return (await axiosInstance.get(`/execution-runs/${executionId}`)).data;
}

export async function cancelCodeExecution(executionId: string): Promise<void> {
  await axiosInstance.post(`/execution-runs/${executionId}/cancel`);
}
