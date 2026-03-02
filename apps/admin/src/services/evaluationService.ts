// Evaluation Service

import { apiClient } from './api';

export interface Evaluation {
    id: number;
    name?: string;
    user?: string;
    model?: string;
    input?: string;
    score?: number;
    status: string; // Can be 'completed', 'pending', 'failed', or other string values
    date?: string;
    description?: string;
    createdAt?: string;
}

class EvaluationService {
    /**
     * Fetch all evaluations from the API
     */
    async fetchEvaluations(page?: number, limit?: number, status?: string, search?: string): Promise<Evaluation[]> {
        try {
            // API returns { success: true, data: { data: [...items], total, page, limit } }
            // request function automatically unwraps to { data: [...items], total, page, limit }
            const response = await apiClient.evaluations.getAll(page, limit, status, search);
            // For paginated responses, items are in response.data
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch evaluations:', error);
            return [];
        }
    }

    /**
     * Fetch a single evaluation by ID
     */
    async fetchEvaluationById(id: number): Promise<Evaluation | null> {
        try {
            const evaluations = await this.fetchEvaluations();
            return evaluations.find((e) => e.id === id) || null;
        } catch (error) {
            console.error('Failed to fetch evaluation:', error);
            return null;
        }
    }
}

export const evaluationService = new EvaluationService();
