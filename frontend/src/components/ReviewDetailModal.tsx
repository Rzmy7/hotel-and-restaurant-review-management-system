import { X, Star, MessageSquareText, Cpu, Clock, CalendarDays, ExternalLink, RefreshCw, PenTool, Scissors, Copy, CheckCircle2, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import type { Review } from '../types/reviews';
import { useReviews } from '../contexts/ReviewsContext';
import { useState, useEffect } from 'react';
import { reviewsService } from '../services/reviewsService';
import ReviewDetailLightbox from './reviews/ReviewDetailLightbox';

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
}

const ReviewDetailModal = ({ isOpen, onClose, review }: ReviewDetailModalProps) => {
  const { navigateReview, reviews, refreshData } = useReviews();
  const [draftReply, setDraftReply] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Initialize draft when review changes
  useEffect(() => {
    if (review) {
      setDraftReply("");
      setIsCopied(false);
      setSelectedPhotoIndex(null);
    }
  }, [review]);

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

  const handleMarkResolved = async () => {
    setIsResolving(true);
    try {
      await reviewsService.updateReviewStatus(review.id, 'Replied');
      await refreshData();
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  const handleSave = async () => {
    if (!draftReply) return;
    setIsSaving(true);
    try {
      await reviewsService.saveReply(review.id, draftReply);
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
      case "Positive": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "Negative": return "bg-rose-50 text-rose-600 border-rose-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Premium minimal look */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-lg font-black text-[#4e80ee] uppercase">
              {review.userName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{review.userName}</h2>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-100 text-gray-200"}
                    />
                  ))}
                </div>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {formatDate(review.date)}
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="text-[12px] font-black text-[#4e80ee] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {review.source}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-white border border-gray-100 shadow-sm ${isFirst ? 'text-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : 'text-gray-400 hover:bg-gray-100 hover:text-[#4e80ee]'}`}
              onClick={() => navigateReview('prev')}
              title="Previous Review"
              disabled={isFirst}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-white border border-gray-100 shadow-sm ${isLast ? 'text-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : 'text-gray-400 hover:bg-gray-100 hover:text-[#4e80ee]'}`}
              onClick={() => navigateReview('next')}
              title="Next Review"
              disabled={isLast}
            >
              <ChevronRight size={20} />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors bg-white border border-gray-100 shadow-sm"
              onClick={onClose}
              title="Close Details View"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">

            {/* Left Column: Review Content & Photos */}
            <div className="lg:col-span-2 space-y-8">

              {/* Review Bubble */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative">
                <div className="absolute top-6 -left-3 border-y-8 border-y-transparent border-r-8 border-r-white w-0 h-0 filter drop-shadow-sm" />
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquareText size={18} className="text-gray-400" />
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Customer Review</h3>
                </div>
                <p className="text-[15px] leading-relaxed text-gray-800 break-words whitespace-pre-wrap font-medium">
                  "{review.reviewText}"
                </p>
              </div>

              {/* Photos */}
              {review.photos && review.photos.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Attachments ({review.photos.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {review.photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group cursor-pointer bg-white"
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
              )}

              {/* AI Draft Section */}
              <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm relative z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent -z-10" />
                <div className="px-6 py-4 border-b border-blue-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-[#4e80ee]" />
                    <h3 className="text-[12px] font-black text-[#4e80ee] uppercase tracking-widest">AI Drafted Response</h3>
                  </div>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Ready for Review
                  </span>
                </div>

                <div className="p-6">
                  <div className="min-h-[140px] w-full p-4 bg-white/80 border border-blue-100/50 rounded-xl text-[14px] font-medium text-gray-700 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all shadow-sm shadow-blue-50 relative overflow-hidden">
                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <RefreshCw size={24} className="text-[#4e80ee] animate-spin" />
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
                    <button
                      onClick={() => handleGenerate('standard')}
                      disabled={isGenerating || isSaving}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:text-[#4e80ee] hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} /> Regenerate
                    </button>
                    <button
                      onClick={() => handleGenerate('professional')}
                      disabled={isGenerating || isSaving}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:text-[#4e80ee] hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <PenTool size={14} /> Professional Tone
                    </button>
                    <button
                      onClick={() => handleGenerate('standard', 'short')}
                      disabled={isGenerating || isSaving}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:text-[#4e80ee] hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Scissors size={14} /> Shorten
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={handleCopy}
                      disabled={!draftReply || isGenerating || isCopied}
                      className="px-4 py-2 bg-[#4e80ee] hover:bg-blue-600 disabled:bg-gray-300 disabled:shadow-none min-w-[80px] justify-center text-white rounded-lg text-[12px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-blue-200 active:scale-95"
                    >
                      {isCopied ? <CheckCircle2 size={14} className="text-white" /> : <Copy size={14} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: AI Analysis & Metadata */}
            <div className="space-y-6">
              {/* Insights Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -z-10 -m-10" />
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
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

                  {/* Categories */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Topic Categories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {review.categories?.length ? review.categories.map((cat, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          {cat}
                        </span>
                      )) : <span className="text-xs text-gray-400 italic">None identified</span>}
                    </div>
                  </div>

                  {/* Key Phrases */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Key Phrases</span>
                    <div className="flex flex-wrap gap-1.5">
                      {review.keyPhrases?.length ? review.keyPhrases.map((phrase, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-[#4e80ee] border border-blue-100">
                          "{phrase}"
                        </span>
                      )) : <span className="text-xs text-gray-400 italic">None extracted</span>}
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">AI Summary</span>
                    <p className="text-[13px] text-gray-600 leading-relaxed font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {review.summary || "Summary not available for this review."}
                    </p>
                  </div>
                </div>
              </div>

              {/* System Metadata */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Clock size={16} /> System Metadata
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500 font-bold">Review ID</span>
                    <span className="text-gray-900 font-mono tracking-tighter bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{review.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500 font-bold">Platform ID</span>
                    <span className="text-[#4e80ee] font-mono tracking-tighter bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 cursor-pointer hover:underline">
                      {review.platformReviewId || "N/A"} <ExternalLink size={10} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500 font-bold">Language</span>
                    <span className="text-gray-900 font-medium">{review.language || "English"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500 font-bold">First Seen</span>
                    <span className="text-gray-900 font-medium">{formatDate(review.firstSeen)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500 font-bold">Last Scraped</span>
                    <span className="text-gray-900 font-medium">{formatDate(review.scrapedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-8 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between mt-auto">
          <button
            className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
            onClick={onClose}
          >
            Close View
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkResolved}
              disabled={isResolving || isSaving || review.status === 'Replied'}
              className="px-6 py-2.5 rounded-xl text-[13px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 shadow-sm transition-all uppercase tracking-wider active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              {isResolving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {review.status === 'Replied' ? 'Resolved' : 'Mark as Resolved'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isResolving || !draftReply}
              className="px-8 py-2.5 rounded-xl text-[13px] font-black text-white bg-blue-500 hover:bg-blue-600 transition-all uppercase tracking-wider shadow-xl shadow-gray-200 active:scale-95 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Image Lightbox */}
      <ReviewDetailLightbox
        review={review}
        selectedPhotoIndex={selectedPhotoIndex}
        onClose={() => setSelectedPhotoIndex(null)}
        onNavigate={setSelectedPhotoIndex}
      />
    </div>
  );
};

export default ReviewDetailModal;
