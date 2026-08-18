import { apiClient } from '../api/client';
import type { PaginatedResponse } from '../types';

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
    pauseReason?: string;
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

export interface BatchConfig {
    batch_size: number;
    min: number;
    max: number;
    default: number;
    parallel_batches: number;
    parallel_min: number;
    parallel_max: number;
    parallel_default: number;
}

export const fetchReviewProcessingStats = (): Promise<ReviewProcessingStats> => {
    return apiClient.get<ReviewProcessingStats>('/admin/monitoring/review-processing/stats');
};

export const resumeReviewProcessing = (): Promise<{ status: string; message: string }> => {
    return apiClient.post<{ status: string; message: string }>('/admin/monitoring/review-processing/resume');
};

export const pauseReviewProcessing = (): Promise<{ status: string; message: string }> => {
    return apiClient.post<{ status: string; message: string }>('/admin/monitoring/review-processing/pause');
};

export const fetchReviewProcessingJobs = (
    page: number,
    limit: number,
    search?: string
): Promise<PaginatedResponse<ReviewProcessingJob>> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (search) {
        params.append('search', search);
    }
    return apiClient.get<PaginatedResponse<ReviewProcessingJob>>(`/admin/monitoring/review-processing/jobs?${params}`);
};

export const getBatchConfig = (): Promise<BatchConfig> => {
    return apiClient.get<BatchConfig>('/admin/monitoring/review-processing/batch-config');
};

export const updateBatchConfig = (batchSize: number, parallelBatches: number): Promise<BatchConfig> => {
    return apiClient.patch<BatchConfig>('/admin/monitoring/review-processing/batch-config', { 
        batch_size: batchSize, 
        parallel_batches: parallelBatches 
    });
};

export const retryFailedReviews = (sourceId: string): Promise<{ status: string; message: string; count: number }> => {
    return apiClient.post<{ status: string; message: string; count: number }>(
        `/admin/monitoring/review-processing/retry/${sourceId}`
    );
};


 export const retryAllFailedReviews = (): Promise<{ status: string; message: string; count: number }> => {
     return apiClient.post<{ status: string; message: string; count: number }>(
         '/admin/monitoring/review-processing/retry-all'
     );
 };

export interface DuplicateStats {
    sources: {
        groups: number;
        redundant: number;
    };
    reviews: {
        groups: number;
        redundant: number;
    };
}

export const testDuplicates = (): Promise<{ status: string; duplicates: DuplicateStats }> => {
    return apiClient.get<{ status: string; duplicates: DuplicateStats }>('/admin/monitoring/dupes-test');
};

export const cleanupDuplicates = (): Promise<{ status: string; deleted: { reviews: number; sources: number } }> => {
    return apiClient.post<{ status: string; deleted: { reviews: number; sources: number } }>('/admin/monitoring/dupes-cleanup');
};

