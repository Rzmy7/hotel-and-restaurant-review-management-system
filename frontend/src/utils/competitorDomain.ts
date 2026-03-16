export const DOMAIN_OPTIONS = ['Hotel', 'Restaurant / Cafe'] as const;

export type CompetitorDomain = (typeof DOMAIN_OPTIONS)[number];

const RESTAURANT_KEYWORDS = [
    'restaurant',
    'cafe',
    'bar',
    'bistro',
    'diner',
    'grill',
    'kitchen',
    'eatery',
    'coffee',
    'pizza',
    'burger',
    'zomato',
    'opentable',
    'yelp',
    'ubereats',
    'doordash',
    'swiggy',
    'food',
];

export function inferCompetitorDomain(competitor: {
    name?: string | null;
    location?: string | null;
    bookingUrl?: string | null;
}): CompetitorDomain {
    const haystack = [competitor.name, competitor.location, competitor.bookingUrl]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return RESTAURANT_KEYWORDS.some((keyword) => haystack.includes(keyword))
        ? 'Restaurant / Cafe'
        : 'Hotel';
}