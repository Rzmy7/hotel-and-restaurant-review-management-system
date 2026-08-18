export interface Review {
    id: number | string;
    rating: number;
    userName: string;
    reviewerName?: string;
    reviewText: string;
    text?: string;
    sentiment: 'Positive' | 'Neutral' | 'Negative';
    categories: string[];
    source: string;
    date: string;
    reviewDate?: string;
    status: 'pending' | 'processed';
    language?: string;
    photos?: { id: number; src: string; alt: string }[];
    keyPhrases?: string[];
    summary?: string;
    scraper_review_id?: string;
    platformReviewId?: string;
    replyStatus?: string;
    firstSeen?: string;
    lastUpdated?: string;
    scrapedAt?: string;
    hasReply?: string;
    isAiReply?: boolean;
    heading?: string;
    positiveText?: string;
    negativeText?: string;
    sentimentScore?: number;
    aiReply?: string;
    ai_reply?: string;
}

export interface ReviewStats {
    totalReviews: number;
    averageRating: number;
    pendingReplies: number;
    sentimentScore: number;
}

export interface FilterState {
    search: string;
    useEmbeddingSearch: boolean;
    rating: number[];
    sentiment: string[];
    source: string[];
    category: string[];
    language: string[];
    status: string[];
    hasAiReply: boolean;
    dateFrom?: string;
    dateTo?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface FetchReviewsParams extends Partial<FilterState> {
    page?: number;
    limit?: number;
    sortBy?: 'date' | 'rating';
    sortOrder?: 'asc' | 'desc';
}
