
import ReviewsHeaderTop from './ReviewHeaderTop';
import ReviewsHeaderBottom from './ReviewHeaderBottom';

const ReviewsHeader: React.FC = () => {
  return (
    <div>
      {/* 1. The Top Part (Title, Search, etc) */}
      <ReviewsHeaderTop />

      {/* 2. The Bottom Part (Pills, Count) */}
      <ReviewsHeaderBottom />
    </div>
  );
};

export default ReviewsHeader;