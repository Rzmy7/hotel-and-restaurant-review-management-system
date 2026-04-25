import type { Competitor, CompetitorListResponse, RankingsData, ComparisonData, AiInsights } from '../services/competitorService';

export const MOCK_COMPETITORS: CompetitorListResponse = {
    tracked: [
        {
            id: '1',
            name: 'Grand Plaza Hotel',
            location: 'Downtown District',
            location_url: 'https://booking.com/grand-plaza',
            organization_id: null,
            avgRating: 4.8,
            sentimentScore: 92,
            reviewCount: 1250,
            isTracked: true,
            status: 'Active',
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            name: 'Riverside Resort & Spa',
            location: 'Waterfront Area',
            location_url: 'https://booking.com/riverside-resort',
            organization_id: null,
            avgRating: 4.5,
            sentimentScore: 85,
            reviewCount: 980,
            isTracked: true,
            status: 'Active',
            createdAt: new Date().toISOString()
        }
    ],
    available: [
        {
            id: '101',
            name: 'The Skyline Inn',
            location: 'Central Heights',
            location_url: 'https://booking.com/skyline-inn',
            organization_id: null,
            avgRating: 4.2,
            sentimentScore: 78,
            reviewCount: 450,
            isTracked: false,
            status: 'Available',
            createdAt: new Date().toISOString()
        }
    ]
};

export const MOCK_RANKINGS: RankingsData = {
    rankings: [
        { rank: 1, name: 'Grand Plaza Hotel', isYou: false, rating: 4.8, sentiment: 92, reviews: 1250 },
        { rank: 2, name: 'My Premium Hotel', isYou: true, rating: 4.6, sentiment: 88, reviews: 850 },
        { rank: 3, name: 'Riverside Resort & Spa', isYou: false, rating: 4.5, sentiment: 85, reviews: 980 },
        { rank: 4, name: 'The Skyline Inn', isYou: false, rating: 4.2, sentiment: 78, reviews: 450 }
    ],
    yourRank: 2,
    totalCompetitors: 4,
    topPerformer: { rank: 1, name: 'Grand Plaza Hotel', isYou: false, rating: 4.8, sentiment: 92, reviews: 1250 }
};

export const MOCK_COMPARISON = (competitorId: string): ComparisonData => ({
    competitor: MOCK_COMPETITORS.tracked.find(c => c.id === competitorId) || MOCK_COMPETITORS.tracked[0],
    myOrganizationName: 'My Hotel',
    kpis: {
        avgRating: { myHotel: 4.6, competitor: 4.8, gap: -0.2 },
        reviewCount: { myHotel: 850, competitor: 1250, gap: -400 },
        positivePercent: { myHotel: 88, competitor: 92, gap: -4 },
        negativePercent: { myHotel: 5, competitor: 3, gap: 2 }
    },
    aspectData: [
        { subject: 'Service', myHotel: 90, competitor: 95, fullMark: 100 },
        { subject: 'Location', myHotel: 95, competitor: 92, fullMark: 100 },
        { subject: 'Price', myHotel: 80, competitor: 75, fullMark: 100 },
        { subject: 'Cleanliness', myHotel: 85, competitor: 90, fullMark: 100 },
        { subject: 'Amenities', myHotel: 88, competitor: 85, fullMark: 100 }
    ],
    trendData: [
        { name: 'Jan', myHotel: 4.4, competitor: 4.5 },
        { name: 'Feb', myHotel: 4.5, competitor: 4.7 },
        { name: 'Mar', myHotel: 4.6, competitor: 4.8 }
    ],
    sentimentData: [
        { name: 'Positive', myHotel: 88, competitor: 92 },
        { name: 'Neutral', myHotel: 7, competitor: 5 },
        { name: 'Negative', myHotel: 5, competitor: 3 }
    ]
});

export const MOCK_AI_INSIGHTS: AiInsights = {
    strengths: [
        'Superior location rating compared to Grand Plaza',
        'Stronger amenity satisfaction in recent reviews'
    ],
    weaknesses: [
        'Lower volume of reviews (850 vs 1250)',
        'Slightly lower service scores in corporate segment'
    ],
    recommendations: [
        'Leverage the prime location in marketing campaigns',
        'Identify specific service bottlenecks mentioned in Q1 reviews'
    ],
    tags: [
        { label: 'Location Leader', type: 'positive' },
        { label: 'Review Velocity Low', type: 'warning' }
    ]
};
