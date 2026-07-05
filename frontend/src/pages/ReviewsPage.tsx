import { RefreshCw, Download, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useReviewsStore } from '../stores/useReviewsStore';
import { useReviewFilters } from '../hooks/useReviewFilters';
import { useEffect } from 'react';
import { useOrganizationStore } from '../stores/useOrganizationStore';

// New Components
import ReviewStats from '../components/reviews/ReviewStats';
import ReviewsToolbar from '../components/reviews/ReviewsToolbar';
import ReviewsTable from '../components/reviews/ReviewsTable';
import ReviewDetailModal from '../components/reviews/ReviewDetailModal';
import DateRangeModal from '../components/shared/DateRangeModal';
import { useReviewsData } from '../hooks/useReviewsData';
import ReviewsSkeleton from './ReviewsSkeleton';

const ReviewsPageContent = () => {
  const currentOrg = useOrganizationStore(state => state.currentOrg);
  const organizationId = currentOrg?.id ?? '';

  const { filters, setDateRange, fetchParams, setPage } = useReviewFilters();
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

  // TanStack Query Hook
  const { 
    reviews, 
    pagination, 
    stats,
    filtersConfig, 
    isLoading: loading, 
    refresh 
  } = useReviewsData(organizationId, fetchParams);

  // Modal State from Store
  const selectedReview = useReviewsStore(state => state.selectedReview);
  const isModalOpen = useReviewsStore(state => state.isModalOpen);
  const closeReview = useReviewsStore(state => state.closeReview);

  const handleDateRangeApply = (dateFrom: string, dateTo: string) => {
    setDateRange(dateFrom, dateTo);
  };

  const handleRefresh = () => {
    setPage(0);
    refresh();
  };

  const handleExportCsv = () => {
    if (!reviews || !reviews.length) return;
    const headers = ['date', 'source', 'rating', 'sentiment', 'reviewerName', 'heading', 'text', 'status'];
    const csv = [
      headers.join(','),
      ...reviews.map((r: any) => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'reviews.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!reviews || !reviews.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>Reviews Export</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Reviews Export</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Rating</th>
                <th>Reviewer</th>
                <th>Review</th>
                <th>Sentiment</th>
              </tr>
            </thead>
            <tbody>
              ${reviews.map((r: any) => `
                <tr>
                  <td style="white-space: nowrap">${new Date(r.date).toLocaleDateString()}</td>
                  <td>${r.source}</td>
                  <td>${r.rating}/5</td>
                  <td>${r.userName || ''}</td>
                  <td>${String(r.reviewText || '').replace(/</g, '&lt;')}</td>
                  <td>${r.sentiment || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading && (!reviews || reviews.length === 0)) {
    return <ReviewsSkeleton />;
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Reviews Management
            </h1>
            {!loading && pagination.total > 0 && (
              <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                {pagination.total} Total
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
            Monitor, analyze, and respond to customer feedback
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            className={`w-10 h-10 grid place-items-center bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-400 rounded-xl transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-[#4e80ee] hover:shadow-sm active:scale-90 ${loading ? 'animate-spin border-blue-600 dark:border-blue-500' : ''}`}
            title="Refresh System"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={() => setIsDateRangeOpen(true)}
            className={`flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-[13px] font-bold transition-all duration-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-[#4e80ee] active:scale-95 shadow-sm ${filters.dateFrom && filters.dateTo
              ? 'border-blue-400 dark:border-blue-500 text-[#4e80ee] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40'
              : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
              }`}
          >
            <Calendar size={16} />
            {filters.dateFrom && filters.dateTo ? 'Filtered Result' : 'Date Range'}
          </button>

          <div className="flex bg-[#4e80ee] rounded-xl shadow-lg shadow-blue-100 transition-transform transform hover:-translate-y-0.5">
            <button 
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 hover:bg-blue-600 text-white px-4 py-2.5 rounded-l-xl text-[12px] font-black uppercase tracking-widest border-r border-blue-400"
            >
              <Download size={16} /> CSV
            </button>
            <button 
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 hover:bg-blue-600 text-white px-4 py-2.5 rounded-r-xl text-[12px] font-black uppercase tracking-widest"
            >
              PDF
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">
        {/* Stats Section */}
        {stats && <ReviewStats stats={stats} isLoading={loading} />}

        {/* Filters Toolbar */}
        <ReviewsToolbar filtersConfig={filtersConfig} pagination={pagination} />

        {/* Reviews List */}
        <ReviewsTable reviews={reviews} pagination={pagination} isLoading={loading} />
      </main>

      {/* Modals */}
      {selectedReview && (
        <ReviewDetailModal
          isOpen={isModalOpen}
          onClose={closeReview}
          review={selectedReview as any}
          allReviews={reviews as any}
        />
      )}

      <DateRangeModal
        isOpen={isDateRangeOpen}
        onClose={() => setIsDateRangeOpen(false)}
        onApply={handleDateRangeApply}
        initialDateFrom={filters.dateFrom}
        initialDateTo={filters.dateTo}
      />
    </div>
  );
};

export default ReviewsPageContent;