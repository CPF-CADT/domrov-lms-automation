import { apiClient } from "./api";

export interface AIUsageUser {
  firstName: string;
  lastName: string | null;
  email: string;
  profilePictureUrl: string | null;
  status: string;
}

export interface AIUsageLog {
  id: number;
  title: string;
  inputTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  usingDate: string;
  createdAt: string;
  user: AIUsageUser;
}

export interface AIUsageLogsListResponse {
  data: AIUsageLog[];
  total: number;
  page: number;
  limit: number;
  filtered: boolean;
}

class AIUsageLogService {
  async fetchLogs(
    page: number = 1,
    limit: number = 10,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
    sortBy: "newest" | "oldest" | "tokenCountDesc" | "tokenCountAsc" = "newest",
  ): Promise<AIUsageLogsListResponse> {
    try {
      // Assuming you add this endpoint to your apiClient:
      // GET /admin/evaluations/ai-usage-logs
      const response = await apiClient.evaluations.getAIUsageLogs({
        page,
        limit,
        search,
        dateFrom,
        dateTo,
        sortBy,
      });

      return {
        data: response.data || [],
        total: response.total || 0,
        page: response.page || 1,
        limit: response.limit || 10,
        filtered: response.filtered || false,
      };
    } catch (error) {
      console.error("Failed to fetch AI usage logs:", error);
      throw error;
    }
  }
}

export const aiUsageLogService = new AIUsageLogService();
