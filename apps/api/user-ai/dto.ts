// /api/user-ai/dto.ts

export interface CreateUserAIKeyDto {
  provider: string;
  model?: string;
  apiKey: string;
  apiEndpoint?: string;
  label?: string;
}

export interface UpdateUserAIKeyDto {
  model?: string;
  apiKey?: string;
  apiEndpoint?: string;
  label?: string;
  isActive?: boolean;
  isValid?: boolean;
}

export interface UserAIKeyResponseDto {
  id: number;
  provider: string;
  model?: string;
  apiKey: string;
  apiEndpoint?: string;
  label?: string;
  isActive: boolean;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
}

export interface UserAILogsResponseDto {
  id: number;
  keyId: number;
  model: string;
  prompt: string;
  completion: string;
  totalTokens: number;
  costUSD: number;
  createdAt: Date;
}

export interface UserAILogByModelResponseDto {
  model: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUSD: number;
  averageTokensPerCall: number;
  lastUsedAt: Date;
}
