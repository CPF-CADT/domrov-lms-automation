/**
 * DTOs for AI Evaluation Settings
 */

export interface AIProviderDto {
  provider: string;
  description: string;
}

export interface CreateUserAIKeyDto {
  provider: string;
  model: string;
  apiKey: string;
  label: string;
  apiEndpoint?: string; 
}

export interface UserAIKeyResponseDto {
  id: number;
  userId: number;
  provider: string;
  model: string;
  isActive: boolean;
  isValid: boolean;
  label: string;
  apiEndpoint?: string; 
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserAIKeyDto {
  provider?: string;
  model?: string;
  apiKey?: string;
  label?: string;
  isActive?: boolean;
  apiEndpoint?: string; 
}