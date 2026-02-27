export interface Review {
    id: number | string;
    rating: number;
    userName: string;
    reviewText: string;
    sentiment: 'Positive' | 'Neutral' | 'Negative';
    categories: string[];
    source: string;
    date: string;
    status: 'Pending' | 'Replied' | 'AI Draft';
    language?: string;
    photos?: { id: number; src: string; alt: string }[];
    keyPhrases?: string[];
    summary?: string;
    platformReviewId?: string;
    replyStatus?: string;
    firstSeen?: string;
    lastUpdated?: string;
    scrapedAt?: string;
    hasReply?: string;
    isAiReply?: boolean;
}

export interface ReviewStats {
    totalReviews: number;
    averageRating: number;
    pendingReplies: number;
    sentimentScore: number;
}

export interface FilterState {
    search: string;
    rating: number[];
    sentiment: string[];
    source: string[];
    category: string[];
    language: string[];
    hasAiReply: boolean;
}
