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
export async function fetchCompetitors(organizationId: string): Promise<CompetitorListResponse> {
    return apiClient.get<CompetitorListResponse>(`/competitors/`, { organization_id: organizationId });
}

export interface CompetitorSourceInput {
    platform_id: number;
    source_url: string;
}

/** Register a new competitor as an ownerless organization with city+country+type+sources. */
export async function addCompetitor(organizationId: string, params: {
    name: string;
    organization_type_id: number;
    city: string;
    country: string;
    sources: CompetitorSourceInput[];
}): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors/?organization_id=${organizationId}`, params);
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
export async function fetchSuggestedCompetitors(organizationId: string): Promise<SuggestionsResponse> {
    return apiClient.get<SuggestionsResponse>(`/competitors/suggestions`, { organization_id: organizationId });
}

/** Track a suggested organization as a competitor (no new org is created). */
export async function addCompetitorFromOrganization(organizationId: string, target_organization_id: string):
    Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(
        `/competitors/from-organization?organization_id=${organizationId}`, { organization_id: target_organization_id }
    );
}

/** User: start tracking a competitor from the available pool */
export async function trackCompetitor(organizationId: string, competitorId: string): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors/track?organization_id=${organizationId}`, { competitorId });
}

/** User: stop tracking a competitor */
export async function untrackCompetitor(organizationId: string, competitorId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/competitors/untrack?organization_id=${organizationId}`, { competitorId });
}

/** Admin: permanently delete a competitor */
export async function deleteCompetitor(organizationId: string, competitorId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/competitors/${competitorId}?organization_id=${organizationId}`);
}

/** Trigger scraping for a competitor's Booking.com page */
export async function scrapeCompetitor(competitorId: string, headless = true): Promise<{ message: string; competitorId: string }> {
    return apiClient.post<{ message: string; competitorId: string }>(`/competitors/${competitorId}/scrape`, { headless });
}

/** Get rankings: your hotel + all tracked competitors */
export async function fetchRankings(organizationId: string): Promise<RankingsData> {
    return apiClient.get<RankingsData>(`/competitors/rankings`, { organization_id: organizationId });
}

/** Get full comparison data between your hotel and a competitor */
export async function fetchComparison(organizationId: string, competitorId: string): Promise<ComparisonData> {
    return apiClient.get<ComparisonData>(`/competitors/${competitorId}/compare`, { organization_id: organizationId });
}

/** Get real-time AI comparison insights */
export async function fetchAiInsights(organizationId: string, competitorId: string): Promise<AiInsights> {
    return apiClient.get<AiInsights>(`/competitors/${competitorId}/insights`, { organization_id: organizationId });
}
