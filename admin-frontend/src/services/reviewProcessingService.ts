import { apiClient } from '../api/client';

export interface ReviewProcessingStats {
    activeJobs: number;
    activeJobsChange: number;
    completedToday: number;
    successRate: number;
    failedJobs: number;
    reviewsProcessed: number;
    reviewsChange: number;
    pendingReviews: number;
    isPaused: boolean;
}

export interface ReviewProcessingJob {
    id: string;
    jobId: string;
    platform: string;
    platformIcon: string;
    platformColor: string;
    organization: string;
    status: 'Running' | 'Queued' | 'Completed' | 'Failed' | 'Paused';
    startTime: string;
    duration: string;
    reviewsProcessed: number | null;
    totalReviews: number | null;
}

export interface GeminiApiKeyConfig {
    apiKey: string;
    isConfigured: boolean;
    lastTestedAt: string | null;
    lastTestResult: 'success' | 'error' | null;
}

export const fetchReviewProcessingStats = (): Promise<ReviewProcessingStats> => {
    return apiClient.get<ReviewProcessingStats>('/admin/monitoring/review-processing/stats');
};

export const resumeReviewProcessing = (): Promise<{ status: string; message: string }> => {
    return apiClient.post<{ status: string; message: string }>('/admin/monitoring/review-processing/resume');
};

export const fetchReviewProcessingJobs = (): Promise<ReviewProcessingJob[]> => {
    return apiClient.get<ReviewProcessingJob[]>('/admin/monitoring/review-processing/jobs');
};

export const getGeminiApiKeyConfig = (): Promise<GeminiApiKeyConfig> => {
    return apiClient.get<GeminiApiKeyConfig>('/admin/monitoring/review-processing/gemini-config');
};

export const saveGeminiApiKey = (apiKey: string): Promise<{ status: string; message: string }> => {
    return apiClient.post<{ status: string; message: string }>('/admin/monitoring/review-processing/gemini-config', { apiKey });
};

export const testGeminiApiKey = (apiKey: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>('/admin/monitoring/review-processing/gemini-config/test', { apiKey });
};

export const retryFailedReviews = (sourceId: string): Promise<{ status: string; message: string; count: number }> => {
    return apiClient.post<{ status: string; message: string; count: number }>(
        `/admin/monitoring/review-processing/retry/${sourceId}`
    );
};
