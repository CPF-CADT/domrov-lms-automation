interface ScoreCriteria {
    value: number[];
}

export interface EvaluateRequest {
    submission_id: string;
    score: ScoreCriteria;
    feedback: string;
    input_token: number;
    output_token: number;
    ai_model: string;
}

export interface EvaluateResponse {
    success: boolean;
    message: string;
}
export interface TasksResponse {
    success: boolean;
    message: string;
    job_id?: string;
}

export interface NotifyUserAiModelInsufficientRequest {
    submission_id: string;
    raw_response_message: string;
}

export interface NotifyUserAiModelInsufficientResponse {
    success: boolean;
    message: string;
}
