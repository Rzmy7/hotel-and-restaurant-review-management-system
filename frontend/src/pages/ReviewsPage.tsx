// src/pages/ReviewsPage.tsx

import ReviewsHeader from '../components/ReviewHeader';
import ReviewList from '../components/ReviewList';

interface ReviewsPageProps {
  toggleSidebar?: () => void; // deprecated, no longer used
}

import { ReviewsProvider } from '../contexts/ReviewsContext';

const ReviewsPage: React.FC<ReviewsPageProps> = () => {
  return (
    <ReviewsProvider>
      <div className="page-content">
        <ReviewsHeader />
        <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6">
          <ReviewList />
        </div>
      </div>
    </ReviewsProvider>
  );
};

export default ReviewsPage;