export interface CreateAIUsageLogDto {
    title: string;
    usingDate?: Date;
    inputTokenCount: number;
    outputTokenCount: number;
    userId: number;
    userKeyId?: number;
}