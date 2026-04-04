/**
 * Competitor Service — real API only, no mock fallback.
 */

import { apiClient } from '../api/client';

// ---------- Types ----------

export interface Competitor {
    id: number;
    name: string;
    location: string;
    bookingUrl: string;
    avgRating: number;
    sentimentScore: number;
    reviewCount: number;
    isTracked: boolean;
    status: string;
    createdAt: string | null;
}

export interface CompetitorListResponse {
    tracked:   Competitor[];
    available: Competitor[];
}

export interface KpiData {
    myHotel:    number;
    competitor: number;
    gap:        number;
}

export interface ComparisonData {
    competitor: Competitor;
    kpis: {
        avgRating:       KpiData;
        reviewCount:     KpiData;
        positivePercent: KpiData;
        negativePercent: KpiData;
    };
    aspectData:   { subject: string; myHotel: number; competitor: number; fullMark: number }[];
    trendData:    { name: string; myHotel: number | null; competitor: number | null }[];
    sentimentData:{ name: string; myHotel: number; competitor: number }[];
}

export interface RankingEntry {
    rank:      number;
    name:      string;
    isYou:     boolean;
    rating:    number;
    sentiment: number;
    reviews:   number;
}

export interface RankingsData {
    rankings:         RankingEntry[];
    yourRank:         number;
    totalCompetitors: number;
    topPerformer:     RankingEntry | null;
}

export interface AiInsights {
    strengths:       string[];
    weaknesses:      string[];
    recommendations: string[];
    tags:            { label: string; type: 'positive' | 'warning' }[];
}

// ---------- API Functions ----------

/** Get all competitors (tracked + available pool) */
export async function fetchCompetitors(): Promise<CompetitorListResponse> {
    return apiClient.get<CompetitorListResponse>(`/competitors`);
}

/** Admin: add a new competitor to the available pool */
export async function addCompetitor(name: string, location: string, bookingUrl: string): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors`, { name, location, bookingUrl });
}

/** User: start tracking a competitor from the available pool */
export async function trackCompetitor(competitorId: number): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors/track`, { competitorId });
}

/** User: stop tracking a competitor */
export async function untrackCompetitor(competitorId: number): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/competitors/untrack`, { competitorId });
}

/** Admin: permanently delete a competitor */
export async function deleteCompetitor(competitorId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/competitors/${competitorId}`);
}

/** Trigger scraping for a competitor's Booking.com page */
export async function scrapeCompetitor(competitorId: number, headless = true): Promise<{ message: string; competitorId: number }> {
    return apiClient.post<{ message: string; competitorId: number }>(`/competitors/${competitorId}/scrape`, { headless });
}

/** Get rankings: your hotel + all tracked competitors */
export async function fetchRankings(): Promise<RankingsData> {
    return apiClient.get<RankingsData>(`/competitors/rankings`);
}

/** Get full comparison data between your hotel and a competitor */
export async function fetchComparison(competitorId: number): Promise<ComparisonData> {
    return apiClient.get<ComparisonData>(`/competitors/${competitorId}/compare`);
}

/** Get real-time AI comparison insights */
export async function fetchAiInsights(competitorId: number): Promise<AiInsights> {
    return apiClient.get<AiInsights>(`/competitors/${competitorId}/insights`);
}
