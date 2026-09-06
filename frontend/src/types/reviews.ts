// Ubiquitous Language: Reviews & Sentiment Intelligence Context
export type SentimentCategory = 'Positive' | 'Neutral' | 'Negative';
export type ReviewSentiment = SentimentCategory;

export type ReviewProcessStatus = 'pending' | 'processed';

export interface ReviewPhoto {
    id: number;
    src: string;
    alt: string;
}

export interface ReviewAspect {
    aspect: string;
    sentiment: SentimentCategory;
    sentimentScore?: number;
    mentionsCount?: number;
    snippet?: string;
}

export interface ReviewReply {
    id?: number | string;
    reviewId: number | string;
    replyText: string;
    isAiGenerated: boolean;
    status: 'draft' | 'pending' | 'sent' | 'failed';
    sentAt?: string;
}

export interface Review {
    id: number | string;
    rating: number;
    userName: string;
    reviewerName?: string;
    reviewText: string;
    text?: string;
    sentiment: SentimentCategory;
    categories: string[];
    aspects?: ReviewAspect[];
    source: string;
    date: string;
    reviewDate?: string;
    status: ReviewProcessStatus;
    language?: string;
    photos?: ReviewPhoto[];
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
