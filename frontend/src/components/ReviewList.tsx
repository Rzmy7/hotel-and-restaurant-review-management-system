import React, { useState, useEffect } from "react";
import ReviewItem from "./ReviewItem";
import ReviewDetailModal from "./ReviewDetailModal";
import "./ReviewList.css";

interface Review {
  id: number | string;
  rating: number;
  userName: string;
  reviewText: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
  source: string;
  date: string;
  status: 'Replied' | 'AI Draft' | 'Pending';
}

interface ReviewsApiResponse {
  reviews: Review[];
}

// const ReviewList = () => {
//   // 1. State for data, loading, and error handling
//   const [reviews, setReviews] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // 2. Fetch data from FastAPI when component mounts
//   useEffect(() => {
//     const fetchReviews = async () => {
//       try {
//         // Ensure this URL matches your running FastAPI instance
//         const response = await fetch("http://127.0.0.1:8000/reviews");
        
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
        
//         const data = await response.json();
//         setReviews(data);
//         setLoading(false);
//       } catch (err) {
//         console.error("Error fetching reviews:", err);
//         setError("Failed to load reviews from API. Is the backend running?");
//         setLoading(false);
//       }
//     };

//     fetchReviews();
//   }, []); // Empty dependency array ensures this runs only once

//   // 3. Render Loading State
//   if (loading) {
//     return <div className="review-list-container">Loading reviews...</div>;
//   }

//   // 4. Render Error State
//   if (error) {
//     return <div className="review-list-container" style={{color: 'red'}}>{error}</div>;
//   }

//   // 5. Render Data
//   return (
//     <>
//       <div className="review-list-container">
//       {/* HEADER ROW */}
//       <div className="review-header-row">
//         <div className="h-col">RATING</div>
//         <div className="h-col">REVIEW SNIPPET</div>
//         <div className="h-col">SENTIMENT</div>
//         <div className="h-col">CATEGORY</div>
//         <div className="h-col">SOURCE</div>
//         <div className="h-col">DATE</div>
//         <div className="h-col">REPLY STATUS</div>
//         <div className="h-col">ACTIONS</div>
//       </div>

//       {/* DATA ROWS */}
//       <div className="review-rows">
//         {reviews.map((review) => (
//           <ReviewItem 
//             key={review.id} 
//             review={review}
//             onOpen={() => handleOpenReview(review)}
//           />
//         ))}
//       </div>
//     </div>

//     {selectedReview && (
//       <ReviewDetailModal 
//         isOpen={isModalOpen}
//         onClose={handleCloseModal}
//         review={selectedReview}
//       />
//     )}
//   </>
//   );
// };

const ReviewList = () => {
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // Ensure this URL matches your running FastAPI instance
        const response = await fetch("http://127.0.0.1:8000/reviews");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ReviewsApiResponse = await response.json();
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("Failed to load reviews from API. Is the backend running?");
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  if (loading) {
    return <div className="review-list-container">Loading reviews...</div>;
  }

  // 4. Render Error State
  if (error) {
    return <div className="review-list-container" style={{color: 'red'}}>{error}</div>;
  }

  const handleOpenReview = (review: Review) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  return (
    <>
      <div className="review-list-container">
      {/* HEADER ROW */}
      <div className="review-header-row">
        <div className="h-col">RATING</div>
        <div className="h-col">REVIEW SNIPPET</div>
        <div className="h-col">SENTIMENT</div>
        <div className="h-col">CATEGORY</div>
        <div className="h-col">SOURCE</div>
        <div className="h-col">DATE</div>
        <div className="h-col">REPLY STATUS</div>
        <div className="h-col">ACTIONS</div>
      </div>

      {/* DATA ROWS */}
      <div className="review-rows">
        {reviews.map((review) => (
          <ReviewItem 
            key={review.id} 
            review={review}
            onOpen={() => handleOpenReview(review)}
          />
        ))}
      </div>
    </div>

    {selectedReview && (
      <ReviewDetailModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        review={selectedReview}
      />
    )}
  </>
  );
};

export default ReviewList;
