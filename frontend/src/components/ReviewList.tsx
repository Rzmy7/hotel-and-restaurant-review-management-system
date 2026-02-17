import { useState, useEffect } from "react";
import ReviewItem from "./ReviewItem";
import ReviewDetailModal from "./ReviewDetailModal";


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
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
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

        const data = await response.json();
        setReviews(data);
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-sm text-gray-500">Loading reviews...</span>
      </div>
    );
  }

  // 4. Render Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mx-6 my-4">
        <p className="text-red-700 text-sm font-medium m-0">{error}</p>
      </div>
    );
  }

  const handleOpenReview = (review: any) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  return (
    <>
      <div className="bg-white rounded-lg">
        {/* HEADER ROW */}
        <div className="grid grid-cols-[60px_3fr_1fr_1.2fr_1fr_1fr_1fr_80px] gap-4 items-start px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">RATING</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">REVIEW SNIPPET</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">SENTIMENT</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">CATEGORY</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">SOURCE</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">DATE</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">REPLY STATUS</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">ACTIONS</div>
        </div>

        {/* DATA ROWS */}
        <div>
          {reviews.map((review: any) => (
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
