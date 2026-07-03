export interface Review {
    id: number | string;
    rating: number;
    userName: string;
    reviewText: string;
    sentiment: 'Positive' | 'Neutral' | 'Negative';
    categories: string[];
    source: string;
    date: string;
    status: 'pending' | 'processed' | 'Replied' | 'AI Draft' | 'Archived' | 'Flagged';
    language?: string;
    photos?: { id: number; src: string; alt: string }[];
    keyPhrases?: string[];
    summary?: string;
    scraper_review_id?: string;
    platformReviewId?: string; // Kept for backward compatibility if needed temporarily
    replyStatus?: string;
    firstSeen?: string;
    lastUpdated?: string;
    scrapedAt?: string;
    hasReply?: string;
    isAiReply?: boolean;
    heading?: string;
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
