// src/pages/ReviewsPage.tsx
import React from 'react';
import ReviewsHeader from '../components/ReviewHeader';
import ReviewList from '../components/ReviewList';

interface ReviewsPageProps {
  toggleSidebar: () => void;
}

const ReviewsPage: React.FC<ReviewsPageProps> = ({ toggleSidebar }) => {
  return (
    <div className="page-content">
      <ReviewsHeader onMenuClick={toggleSidebar} />
      <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6">
        <ReviewList />
      </div>
    </div>
  );
};

export default ReviewsPage;