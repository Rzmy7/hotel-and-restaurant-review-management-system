/**
 * Handles all competitor-related API calls to the backend.
 */

import {
    MOCK_COMPETITORS,
    MOCK_RANKINGS,
    MOCK_COMPARISON,
    MOCK_AI_INSIGHTS
} from '../mocks/competitorMock';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
    tracked: Competitor[];
    available: Competitor[];
}

export interface KpiData {
    myHotel: number;
    competitor: number;
    gap: number;
}

export interface ComparisonData {
    competitor: Competitor;
    kpis: {
        avgRating: KpiData;
        reviewCount: KpiData;
        positivePercent: KpiData;
        negativePercent: KpiData;
    };
    aspectData: { subject: string; myHotel: number; competitor: number; fullMark: number }[];
    trendData: { name: string; myHotel: number | null; competitor: number | null }[];
    sentimentData: { name: string; myHotel: number; competitor: number }[];
}

export interface RankingEntry {
    rank: number;
    name: string;
    isYou: boolean;
    rating: number;
    sentiment: number;
    reviews: number;
}

export interface RankingsData {
    rankings: RankingEntry[];
    yourRank: number;
    totalCompetitors: number;
    topPerformer: RankingEntry | null;
}

export interface AiInsights {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    tags: { label: string; type: 'positive' | 'warning' }[];
}

// ---------- API Functions ----------

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `API error: ${res.status}`);
    }
    return res.json();
}

/** Get all competitors (tracked + available pool) */
export async function fetchCompetitors(): Promise<CompetitorListResponse> {
    try {
        const res = await fetch(`${API_BASE}/competitors`);
        return await handleResponse<CompetitorListResponse>(res);
    } catch (error) {
        console.warn('Competitors API failed, falling back to mock data:', error);
        return MOCK_COMPETITORS;
    }
}

/** Admin: add a new competitor to the available pool */
export async function addCompetitor(name: string, location: string, bookingUrl: string): Promise<{ message: string; competitor: Competitor }> {
    const res = await fetch(`${API_BASE}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, bookingUrl }),
    });
    return handleResponse(res);
}

/** User: start tracking a competitor from the available pool */
export async function trackCompetitor(competitorId: number): Promise<{ message: string; competitor: Competitor }> {
    const res = await fetch(`${API_BASE}/competitors/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId }),
    });
    return handleResponse(res);
}

/** User: stop tracking a competitor */
export async function untrackCompetitor(competitorId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/competitors/untrack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId }),
    });
    return handleResponse(res);
}

/** Admin: permanently delete a competitor */
export async function deleteCompetitor(competitorId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/competitors/${competitorId}`, {
        method: 'DELETE',
    });
    return handleResponse(res);
}

/** Trigger scraping for a competitor's Booking.com page */
export async function scrapeCompetitor(competitorId: number, headless = true): Promise<{ message: string; competitorId: number }> {
    const res = await fetch(`${API_BASE}/competitors/${competitorId}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headless }),
    });
    return handleResponse(res);
}

/** Get rankings: your hotel + all tracked competitors */
export async function fetchRankings(): Promise<RankingsData> {
    try {
        const res = await fetch(`${API_BASE}/competitors/rankings`);
        return await handleResponse<RankingsData>(res);
    } catch (error) {
        console.warn('Rankings API failed, falling back to mock data:', error);
        return MOCK_RANKINGS;
    }
}

/** Get full comparison data between your hotel and a competitor */
export async function fetchComparison(competitorId: number): Promise<ComparisonData> {
    try {
        const res = await fetch(`${API_BASE}/competitors/${competitorId}/compare`);
        return await handleResponse<ComparisonData>(res);
    } catch (error) {
        console.warn(`Comparison API failed for ID ${competitorId}, falling back to mock data:`, error);
        return MOCK_COMPARISON(competitorId);
    }
}

/** Get real-time AI comparison insights */
export async function fetchAiInsights(competitorId: number): Promise<AiInsights> {
    try {
        const res = await fetch(`${API_BASE}/competitors/${competitorId}/insights`);
        return await handleResponse<AiInsights>(res);
    } catch (error) {
        console.warn(`AI Insights API failed for ID ${competitorId}, falling back to mock data:`, error);
        return MOCK_AI_INSIGHTS;
    }
}
