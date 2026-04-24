/**
 * Competitor Service — real API only, no mock fallback.
 */

import { apiClient } from '../api/client';

// ---------- Types ----------

export interface Competitor {
    id: string;
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
    myOrganizationName: string;
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

export interface CompetitorSourceInput {
    platform_id: number;
    source_url: string;
}

/** Register a new competitor as an ownerless organization with city+country+type+sources. */
export async function addCompetitor(params: {
    name: string;
    organization_type_id: number;
    city: string;
    country: string;
    sources: CompetitorSourceInput[];
}): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors`, params);
}

export interface SuggestedCompetitor {
    organization_id: string;
    organization_name: string;
    city: string;
    country: string;
    organization_type_id: number;
    reviewCount: number;
    avgRating: number;
}

export interface SuggestionsResponse {
    status: 'ok' | 'missing_location' | 'no_organization';
    suggestions: SuggestedCompetitor[];
}

/** Fetch up-to-6 orgs with the same city+country+type, excluding own org + already-tracked. */
export async function fetchSuggestedCompetitors(): Promise<SuggestionsResponse> {
    return apiClient.get<SuggestionsResponse>(`/competitors/suggestions`);
}

/** Track a suggested organization as a competitor (no new org is created). */
export async function addCompetitorFromOrganization(organization_id: string):
    Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(
        `/competitors/from-organization`, { organization_id }
    );
}

/** User: start tracking a competitor from the available pool */
export async function trackCompetitor(competitorId: string): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors/track`, { competitorId });
}

/** User: stop tracking a competitor */
export async function untrackCompetitor(competitorId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/competitors/untrack`, { competitorId });
}

/** Admin: permanently delete a competitor */
export async function deleteCompetitor(competitorId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/competitors/${competitorId}`);
}

/** Trigger scraping for a competitor's Booking.com page */
export async function scrapeCompetitor(competitorId: string, headless = true): Promise<{ message: string; competitorId: string }> {
    return apiClient.post<{ message: string; competitorId: string }>(`/competitors/${competitorId}/scrape`, { headless });
}

/** Get rankings: your hotel + all tracked competitors */
export async function fetchRankings(): Promise<RankingsData> {
    return apiClient.get<RankingsData>(`/competitors/rankings`);
}

/** Get full comparison data between your hotel and a competitor */
export async function fetchComparison(competitorId: string): Promise<ComparisonData> {
    return apiClient.get<ComparisonData>(`/competitors/${competitorId}/compare`);
}

/** Get real-time AI comparison insights */
export async function fetchAiInsights(competitorId: string): Promise<AiInsights> {
    return apiClient.get<AiInsights>(`/competitors/${competitorId}/insights`);
}
