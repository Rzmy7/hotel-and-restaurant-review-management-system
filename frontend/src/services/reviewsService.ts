import type { Review, ReviewStats } from '../types/reviews';

// Mock Data
const MOCK_REVIEWS: Review[] = [
    {
        id: 1,
        rating: 5,
        userName: "Alice Smith",
        reviewText: "Absolutely wonderful experience! The food was amazing and the staff was very friendly. Highly recommend the truffle pasta.",
        sentiment: "Positive",
        categories: ["Food", "Service"],
        source: "Google Reviews",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0],
        status: "Pending",
        language: "English",
        keyPhrases: ["wonderful experience", "food was amazing", "friendly staff", "truffle pasta"],
        summary: "The customer had a highly positive experience, specifically praising the food (truffle pasta) and the friendly service.",
        platformReviewId: "GR-12345",
        replyStatus: "Unreplied",
        firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        scrapedAt: new Date().toISOString(),
        hasReply: "No",
        photos: [{ id: 1, src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=200", alt: "Food" }]
    },
    {
        id: 2,
        rating: 2,
        userName: "Bob Johnson",
        reviewText: "The wait time was too long and the room felt a bit outdated. However, the location is great.",
        sentiment: "Negative",
        categories: ["Wait Time", "Facilities"],
        source: "TripAdvisor",
        date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString().split('T')[0],
        status: "AI Draft",
        language: "English"
    },
    {
        id: 3,
        rating: 4,
        userName: "Charlie Brown",
        reviewText: "Good value for money. Breakfast was decent but could have more vegan options.",
        sentiment: "Neutral",
        categories: ["Food", "Value"],
        source: "Booking.com",
        date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString().split('T')[0],
        status: "Replied",
        language: "English"
    },
    {
        id: 4,
        rating: 5,
        userName: "Diana Prince",
        reviewText: "The spa was magnificent! I felt completely relaxed and rejuvenated. Will definitely come back.",
        sentiment: "Positive",
        categories: ["Spa", "Experience"],
        source: "TripAdvisor",
        date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString().split('T')[0],
        status: "Pending",
        language: "English"
    },
    {
        id: 5,
        rating: 1,
        userName: "Eve Adams",
        reviewText: "Terrible service. My reservation was lost and the staff didn't know how to handle it.",
        sentiment: "Negative",
        categories: ["Service", "Booking"],
        source: "Agoda",
        date: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString().split('T')[0],
        status: "Replied",
        language: "English"
    },
    {
        id: 6,
        rating: 5,
        userName: "Frank Castle",
        reviewText: "Outstanding location right by the beach. The ocean view from the balcony is breathtaking. Room was spotless.",
        sentiment: "Positive",
        categories: ["Location", "Cleanliness", "View"],
        source: "Airbnb",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
        status: "Pending",
        language: "English"
    },
];

class ReviewsService {
    async getReviews(): Promise<Review[]> {
        try {
            // Attempt to fetch from the actual API first
            const response = await fetch("http://127.0.0.1:8000/reviews");
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn("Real API unavailable, falling back to mock data.", error);
        }

        // Simulate API delay for mock data
        return new Promise((resolve) => {
            setTimeout(() => resolve([...MOCK_REVIEWS]), 500);
        });
    }

    async getStats(): Promise<ReviewStats> {
        const reviews = await this.getReviews();

        const totalReviews = reviews.length;
        let totalRating = 0;
        let pendingReplies = 0;
        let sentimentScore = 0; // -1 to 1 mapped to 0-100 later

        reviews.forEach(review => {
            totalRating += review.rating;
            if (review.status === 'Pending' || review.status === 'AI Draft') {
                pendingReplies++;
            }

            if (review.sentiment === 'Positive') sentimentScore += 1;
            else if (review.sentiment === 'Negative') sentimentScore -= 1;
        });

        const averageRating = totalReviews > 0 ? Number((totalRating / totalReviews).toFixed(1)) : 0;

        // Calculate a 0-100 sentiment score based on Positive vs Negative ratio
        const normalizedSentiment = totalReviews > 0
            ? Math.round(((sentimentScore / totalReviews) + 1) * 50)
            : 50;

        return {
            totalReviews,
            averageRating,
            pendingReplies,
            sentimentScore: normalizedSentiment
        };
    }
}

export const reviewsService = new ReviewsService();
