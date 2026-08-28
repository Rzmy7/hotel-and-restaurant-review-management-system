import { Star, MessageSquareText, Cpu, Clock, CalendarDays, ExternalLink, RefreshCw, Copy, CheckCircle2, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import type { Review } from '../../types/reviews';
import { useReviewsStore } from '../../stores/useReviewsStore';
import { useReviewFilters } from '../../hooks/useReviewFilters';
import { useState, useEffect } from 'react';
import { reviewsService } from '../../services/reviewsService';
import ReviewDetailLightbox from './ReviewDetailLightbox';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useReviewDetail } from '../../hooks/useReviewDetail';
import Skeleton from '../shared/Skeleton';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
  allReviews?: Review[];
}

const BadgesSkeleton: React.FC = () => (
  <div className="flex flex-wrap gap-1.5 animate-pulse">
    <Skeleton className="h-6 w-16 rounded-md" />
    <Skeleton className="h-6 w-20 rounded-md" />
    <Skeleton className="h-6 w-14 rounded-md" />
  </div>
);

const TextParagraphSkeleton: React.FC = () => (
  <div className="space-y-2 animate-pulse">
    <Skeleton className="h-3.5 w-full rounded" />
    <Skeleton className="h-3.5 w-5/6 rounded" />
    <Skeleton className="h-3.5 w-2/3 rounded" />
  </div>
);

const MetadataSkeleton: React.FC = () => (
  <div className="space-y-3.5 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex justify-between items-center">
        <Skeleton className="h-3.5 w-20 rounded" />
        <Skeleton className="h-5 w-28 rounded" />
      </div>
    ))}
  </div>
);

const PhotosSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
    {[1, 2].map((i) => (
      <div key={i} className="aspect-square rounded-xl bg-gray-100 dark:bg-slate-800" />
    ))}
  </div>
);

const ReviewDetailModal = ({ isOpen, onClose, review: propReview, allReviews = [] }: ReviewDetailModalProps) => {
  const navigateReview = useReviewsStore(state => state.navigateReview);
  const storeReviews = useReviewsStore(state => state.reviews);
  const reviews = allReviews.length > 0 ? allReviews : storeReviews;
  const refreshDataStore = useReviewsStore(state => state.refreshData);
  const { fetchParams } = useReviewFilters();
  const currentOrg = useOrganizationStore(state => state.currentOrg);
  const organizationId = currentOrg?.id || '';
  const refreshData = () => { if (organizationId) refreshDataStore(organizationId, fetchParams); };

  // Fetch detailed review lazily on modal open, using propReview as placeholder for instant UI
  const { data: fetchedReview, loading: isDetailLoading } = useReviewDetail(
    isOpen && propReview?.id ? String(propReview.id) : null,
    propReview?.userName,
    propReview?.heading,
    propReview
  );

  // Combine propReview with fetchedReview details, preferring fetchedReview
  const review = fetchedReview ? { ...propReview, ...fetchedReview } : propReview;

  const [draftReply, setDraftReply] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [tone, setTone] = useState<'professional' | 'casual' | 'standard'>('standard');
  const [replyLength, setReplyLength] = useState<'short' | 'standard'>('standard');

  // Initialize draft when review changes
  useEffect(() => {
    if (review?.id) {
      setDraftReply("");
      setIsCopied(false);
      setSelectedPhotoIndex(null);
      setTone('standard');
      setReplyLength('standard');
    }
  }, [review?.id]);

  // Keyboard navigation for image lightbox
  useEffect(() => {
    if (selectedPhotoIndex === null || !review?.photos) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && selectedPhotoIndex > 0) {
        setSelectedPhotoIndex(prev => prev !== null ? prev - 1 : prev);
      } else if (e.key === 'ArrowRight' && selectedPhotoIndex < review.photos!.length - 1) {
        setSelectedPhotoIndex(prev => prev !== null ? prev + 1 : prev);
      } else if (e.key === 'Escape') {
        setSelectedPhotoIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, review]);

  const handleGenerate = async (tone: 'professional' | 'casual' | 'standard' = 'standard', length: 'short' | 'standard' = 'standard') => {
    setIsGenerating(true);
    try {
      const generated = await reviewsService.generateReply(review, tone, length);
      setDraftReply(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!draftReply) return;
    try {
      await navigator.clipboard.writeText(draftReply);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSave = async () => {
    if (!draftReply) return;
    setIsSaving(true);
    try {
      await reviewsService.saveReply(organizationId, review.id, draftReply);
      await refreshData();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentIndex = reviews.findIndex(r => r.id === review.id);
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= reviews.length - 1;

  const getSentimentStyles = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800";
      case "Negative": return "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800";
      default: return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const customHeader = (
    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md w-full">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0 text-lg font-black text-[#4e80ee] dark:text-blue-400 uppercase">
          {review.userName ? review.userName.charAt(0) : 'U'}
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{review.userName || 'User'}</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-100 text-gray-200 dark:fill-slate-700 dark:text-slate-600"}
                />
              ))}
            </div>
            <span className="w-1 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
            <span className="text-[12px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CalendarDays size={14} />
              {formatDate(review.date)}
            </span>
            <span className="w-1 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
            <span className="text-[12px] font-black text-[#4e80ee] dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">
              {review.source}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mr-12">
        <button
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm ${isFirst ? 'text-gray-200 bg-gray-50 dark:text-slate-600 dark:bg-slate-800/50 cursor-not-allowed opacity-50' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-[#4e80ee] dark:hover:text-blue-400'}`}
          onClick={() => navigateReview('prev', reviews)}
          title="Previous Review"
          disabled={isFirst}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm ${isLast ? 'text-gray-200 bg-gray-50 dark:text-slate-600 dark:bg-slate-800/50 cursor-not-allowed opacity-50' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-[#4e80ee] dark:hover:text-blue-400'}`}
          onClick={() => navigateReview('next', reviews)}
          title="Next Review"
          disabled={isLast}
        >
          <ChevronRight size={20} />
        </button>
        {/* The generic Modal will provide the Close button */}
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between w-full">
      <Button
        variant="ghost"
        onClick={onClose}
        className="text-[13px] px-6"
      >
        Close View
      </Button>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !draftReply}
          className="px-8 text-[13px] uppercase shadow-lg active:scale-95 transition-all"
        >
          {isSaving ? <RefreshCw size={16} className="animate-spin" /> : 'Save Changes'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        footer={footer}
        className="max-w-5xl"
      >
        <div className="flex flex-col w-full h-full">
          {customHeader}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/30 dark:bg-slate-900/50 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">

              {/* Left Column: Review Content & Photos */}
              <div className="lg:col-span-2 space-y-8">

                {/* Review Bubble */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative">
                  <div className="absolute top-6 -left-3 border-y-8 border-y-transparent border-r-8 border-r-white dark:border-r-slate-800 w-0 h-0 filter drop-shadow-sm" />
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquareText size={18} className="text-gray-400 dark:text-slate-500" />
                    <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Customer Review</h3>
                  </div>
                  {review.heading && (
                    <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2 leading-tight">
                      {review.heading}
                    </h4>
                  )}
                  <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap font-medium">
                    "{review.reviewText}"
                  </p>
                </div>

                {/* Photos */}
                {isDetailLoading ? (
                  <div className="mb-6">
                    <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-4">Attachments</h3>
                    <PhotosSkeleton />
                  </div>
                ) : review.photos && review.photos.length > 0 ? (
                  <div>
                    <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-4">Attachments ({review.photos.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {review.photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 group cursor-pointer bg-white dark:bg-slate-800"
                          onClick={() => setSelectedPhotoIndex(index)}
                        >
                          <img
                            src={photo.src}
                            alt={photo.alt}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* AI Draft Section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-blue-900/50 overflow-hidden shadow-sm relative z-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 dark:from-blue-900/20 to-transparent -z-10" />
                  <div className="px-6 py-4 border-b border-blue-50 dark:border-blue-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={18} className="text-[#4e80ee] dark:text-blue-400" />
                      <h3 className="text-[12px] font-black text-[#4e80ee] dark:text-blue-400 uppercase tracking-widest">AI Drafted Response</h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Ready for Review
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="min-h-[140px] w-full p-4 bg-white/80 dark:bg-slate-800/80 border border-blue-100/50 dark:border-blue-900/50 rounded-xl text-[14px] font-medium text-gray-700 dark:text-gray-200 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all shadow-sm shadow-blue-50 dark:shadow-none relative overflow-hidden">
                      {isGenerating && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                          <RefreshCw size={24} className="text-[#4e80ee] dark:text-blue-400 animate-spin" />
                        </div>
                      )}
                      <textarea
                        className="w-full h-full min-h-[120px] bg-transparent resize-none outline-none leading-relaxed relative z-0"
                        placeholder="AI generated response will appear here. Click 'Regenerate' to automatically draft a reply."
                        value={draftReply}
                        onChange={(e) => setDraftReply(e.target.value)}
                        disabled={isGenerating || isSaving}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value as 'professional' | 'casual' | 'standard')}
                        disabled={isGenerating || isSaving}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-semibold text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
                        title="Reply tone"
                      >
                        <option value="standard">Tone: Standard</option>
                        <option value="professional">Tone: Professional</option>
                        <option value="casual">Tone: Casual</option>
                      </select>
                      <select
                        value={replyLength}
                        onChange={(e) => setReplyLength(e.target.value as 'short' | 'standard')}
                        disabled={isGenerating || isSaving}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-semibold text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
                        title="Reply length"
                      >
                        <option value="standard">Length: Standard</option>
                        <option value="short">Length: Short</option>
                      </select>
                      <button
                        onClick={() => handleGenerate(tone, replyLength)}
                        disabled={isGenerating || isSaving}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:text-[#4e80ee] hover:border-blue-300 hover:bg-blue-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:border-blue-800 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} /> Generate
                      </button>
                      <div className="flex-1" />
                      <Button
                        onClick={handleCopy}
                        disabled={!draftReply || isGenerating || isCopied}
                        className={`min-w-[80px] justify-center text-[12px] uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 ${isCopied ? 'bg-emerald-500 hover:bg-emerald-600 border-none' : ''}`}
                      >
                        {isCopied ? <CheckCircle2 size={14} className="text-white" /> : <Copy size={14} />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Analysis & Metadata */}
              <div className="space-y-6">
                {/* Insights Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 dark:bg-slate-700/50 rounded-full blur-3xl -z-10 -m-10" />
                  <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Bot size={16} /> Analysis Insights
                  </h3>

                  <div className="space-y-5">
                    {/* Sentiment */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Sentiment</span>
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border ${getSentimentStyles(review.sentiment)}`}>
                        {review.sentiment}
                      </span>
                    </div>

                    {/* Review Aspects */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest block mb-2">Review Aspects</span>
                      {isDetailLoading ? (
                        <BadgesSkeleton />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {review.categories?.length ? review.categories.map((cat, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600">
                              {cat}
                            </span>
                          )) : <span className="text-xs text-gray-400 dark:text-slate-500 italic">None identified</span>}
                        </div>
                      )}
                    </div>

                    {/* Key Phrases */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest block mb-2">Key Phrases</span>
                      {isDetailLoading ? (
                        <BadgesSkeleton />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {review.keyPhrases?.length ? review.keyPhrases.map((phrase, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-[#4e80ee] border border-blue-100 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800">
                              "{phrase}"
                            </span>
                          )) : <span className="text-xs text-gray-400 dark:text-slate-500 italic">None extracted</span>}
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest block mb-2">AI Summary</span>
                      {isDetailLoading ? (
                        <TextParagraphSkeleton />
                      ) : (
                        <p className="text-[13px] text-gray-600 bg-gray-50 border-gray-100 dark:text-gray-300 dark:bg-slate-700 dark:border-slate-600 leading-relaxed font-medium p-3 rounded-xl border">
                          {review.summary || "Summary not available for this review."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* System Metadata */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Clock size={16} /> System Metadata
                  </h3>
                  {isDetailLoading ? (
                    <MetadataSkeleton />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-500 font-bold dark:text-slate-400">Review ID</span>
                        <span className="text-gray-900 bg-gray-50 border-gray-100 dark:text-white dark:bg-slate-700 dark:border-slate-600 font-mono tracking-tighter px-2 py-0.5 rounded border">{review.id}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-500 font-bold dark:text-slate-400">Platform ID</span>
                        <span className="text-[#4e80ee] bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-900/40 dark:border-blue-800 font-mono tracking-tighter px-2 py-0.5 rounded border flex items-center gap-1 cursor-pointer hover:underline">
                          {review.platformReviewId || "N/A"} <ExternalLink size={10} />
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-500 font-bold dark:text-slate-400">Language</span>
                        <span className="text-gray-900 dark:text-white font-medium">{review.language || "English"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-500 font-bold dark:text-slate-400">First Seen</span>
                        <span className="text-gray-900 dark:text-white font-medium">{formatDate(review.firstSeen)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-500 font-bold dark:text-slate-400">Last Updated</span>
                        <span className="text-gray-900 dark:text-white font-medium">{formatDate(review.scrapedAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </Modal>

      {/* Full Screen Image Lightbox */}
      <ReviewDetailLightbox
        review={review}
        selectedPhotoIndex={selectedPhotoIndex}
        onClose={() => setSelectedPhotoIndex(null)}
        onNavigate={setSelectedPhotoIndex}
      />
    </>
  );
};

export default ReviewDetailModal;
