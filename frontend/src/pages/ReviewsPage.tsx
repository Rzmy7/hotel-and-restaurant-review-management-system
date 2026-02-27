import { RefreshCw, Download, Calendar } from 'lucide-react';
import { useReviews } from '../contexts/ReviewsContext';
import { ReviewsProvider } from '../contexts/ReviewsContext';

// New Components
import ReviewStats from '../components/ReviewStats';
import ReviewsToolbar from '../components/ReviewsToolbar';
import ReviewsTable from '../components/ReviewsTable';
import ReviewDetailModal from '../components/ReviewDetailModal';

const ReviewsPageContent = () => {
  const { stats, loading, refreshData, reviews, selectedReview, isModalOpen, closeReview } = useReviews();

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Redesigned Header - Sophisticated & Consistent */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
              Reviews Management
            </h1>
            {!loading && reviews.length > 0 && (
              <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                {reviews.length} Total
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
            Monitor, analyze, and respond to customer feedback
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={refreshData}
            className={`w-10 h-10 grid place-items-center bg-gray-50 border border-gray-200 text-gray-400 rounded-xl transition-all duration-300 hover:border-blue-400 hover:text-[#4e80ee] hover:shadow-sm active:scale-90 ${loading ? 'animate-spin border-blue-600' : ''}`}
            title="Refresh System"
          >
            <RefreshCw size={18} />
          </button>

          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 transition-all duration-300 hover:bg-gray-50 hover:border-blue-400 hover:text-[#4e80ee] active:scale-95 shadow-sm">
            <Calendar size={16} />
            Date Range
          </button>

          <button className="flex items-center gap-2 bg-[#4e80ee] hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95">
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">
        {/* Stats Section */}
        {stats && <ReviewStats stats={stats} isLoading={loading} />}

        {/* Filters Toolbar */}
        <ReviewsToolbar />

        {/* Reviews List */}
        <ReviewsTable />
      </main>

      {/* Modals */}
      {selectedReview && (
        <ReviewDetailModal
          isOpen={isModalOpen}
          onClose={closeReview}
          review={selectedReview as any}
        />
      )}
    </div>
  );
};

const ReviewsPage = () => {
  return (
    <ReviewsProvider>
      <ReviewsPageContent />
    </ReviewsProvider>
  );
};

export default ReviewsPage;