/**
 * Competitor Service — real API only, no mock fallback.
 */

import { apiClient } from '../api/client';
import { ActivityMessages } from '../constants/activityMessages';

// ---------- Types ----------

export interface Competitor {
    id: string;
    name: string;
    location: string;
    location_url?: string | null;
    organization_id: string | null;
    avgRating: number;
    sentimentScore: number;
    reviewCount: number;
    isTracked: boolean;
    createdAt: string | null;
    status?: string;
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

/** Confidence-adjusted rating KPI — nullable when a side has no reviews at all. */
export interface AdjustedKpiData {
    myHotel:    number | null;
    competitor: number | null;
    gap:        number | null;
}

export interface ComparisonData {
    competitor: Competitor;
    myOrganizationName: string;
    kpis: {
        avgRating:       KpiData;
        /** Volume-weighted Bayesian mean — see backend services/scoring.py */
        adjustedRating:  AdjustedKpiData;
        reviewCount:     KpiData;
        positivePercent: KpiData;
        negativePercent: KpiData;
    };
    /**
     * Aspect scores. `myHotel`/`competitor` are null when that property has no
     * reviews mentioning the aspect — absent evidence, not a score of zero, so
     * the radar leaves a gap instead of plotting the axis at 0.
     * `delta` is positive when your property leads, null when either side is null.
     */
    aspectData:   { subject: string; myHotel: number | null; competitor: number | null; delta: number | null; fullMark: number }[];
    trendData:    { name: string; myHotel: number | null; competitor: number | null }[];
    sentimentData:{ name: string; myHotel: number; competitor: number }[];
}

export interface RankingEntry {
    rank:      number;
    name:      string;
    isYou:     boolean;
    rating:    number;
    /** Bayesian-adjusted rating — this is what rank is sorted on. */
    adjustedRating: number | null;
    sentiment: number;
    reviews:   number;
}

export interface RankingsData {
    rankings:         RankingEntry[];
    yourRank:         number;
    totalCompetitors: number;
    topPerformer:     RankingEntry | null;
    /** Population prior the Bayesian adjustment shrank toward. */
    ratingPrior:      number | null;
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
    location_url: string;
    sources: CompetitorSourceInput[];
}): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors/?organization_id=${organizationId}`, params, {
        activity: ActivityMessages.ADD_COMPETITOR,
        showSuccess: false
    });
}

export interface SuggestedCompetitor {
    organization_id: string;
    organization_name: string;
    location_url: string;
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
        `/competitors/from-organization?organization_id=${organizationId}`, { organization_id: target_organization_id }, {
            activity: ActivityMessages.ADD_COMPETITOR,
            showSuccess: false
        }
    );
}

/** User: start tracking a competitor from the available pool */
export async function trackCompetitor(organizationId: string, competitorId: string): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.post<{ message: string; competitor: Competitor }>(`/competitors/track?organization_id=${organizationId}`, { competitorId }, {
        activity: ActivityMessages.ADD_COMPETITOR,
        showSuccess: false
    });
}

/** User: stop tracking a competitor */
export async function untrackCompetitor(organizationId: string, competitorId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/competitors/untrack?organization_id=${organizationId}`, { competitorId }, {
        activity: ActivityMessages.DELETE_COMPETITOR,
        showSuccess: false
    });
}

/** Admin: permanently delete a competitor */
export async function deleteCompetitor(organizationId: string, competitorId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/competitors/${competitorId}?organization_id=${organizationId}`, {
        activity: ActivityMessages.DELETE_COMPETITOR,
        showSuccess: false
    });
}

/** User: edit a competitor's display name and location */
export async function editCompetitor(organizationId: string, competitorId: string, params: { name: string; location_url: string }): Promise<{ message: string; competitor: Competitor }> {
    return apiClient.put<{ message: string; competitor: Competitor }>(`/competitors/${competitorId}?organization_id=${organizationId}`, params, {
        activity: ActivityMessages.UPDATE_COMPETITOR,
        showSuccess: false
    });
}

/** Trigger scraping for a competitor's Booking.com page */
export async function scrapeCompetitor(competitorId: string, headless = true): Promise<{ message: string; competitorId: string }> {
    return apiClient.post<{ message: string; competitorId: string }>(`/competitors/${competitorId}/scrape`, { headless }, {
        activity: ActivityMessages.REFRESH_COMPETITOR,
        showSuccess: false
    });
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
