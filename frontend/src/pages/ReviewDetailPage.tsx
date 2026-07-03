import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Star, MessageSquareText, Cpu, Clock, CalendarDays, 
    RefreshCw, Copy, CheckCircle2, Bot, ArrowLeft, AlertTriangle, ExternalLink
} from 'lucide-react';
import { reviewsService } from '../services/reviewsService';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import ReviewDetailLightbox from '../components/reviews/ReviewDetailLightbox';
import { Button } from '../components/ui/Button';
import type { Review } from '../types/reviews';

const ReviewDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const organizationId = currentOrg?.id ?? '';

    const [review, setReview] = useState<Review | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [draftReply, setDraftReply] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [tone, setTone] = useState<'professional' | 'casual' | 'standard'>('standard');
    const [replyLength, setReplyLength] = useState<'short' | 'standard'>('standard');

    useEffect(() => {
        if (!id || !organizationId) return;

        const fetchReview = async () => {
            setLoading(true);
            setError(null);
            try {
                const fetched = await reviewsService.getReviewById(organizationId, id);
                setReview(fetched);
                if (fetched?.ai_reply) {
                    setDraftReply(fetched.ai_reply);
                }
            } catch (err: any) {
                console.error("Error fetching review:", err);
                setError(err.message || "Failed to load review details.");
            } finally {
                setLoading(false);
            }
        };

        fetchReview();
    }, [id, organizationId]);

    // Keyboard navigation for image lightbox
    useEffect(() => {
        if (selectedPhotoIndex === null || !review?.photos) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && selectedPhotoIndex > 0) {
                setSelectedPhotoIndex(prev => prev !== null ? prev - 1 : prev);
            } else if (e.key === 'ArrowRight' && selectedPhotoIndex < (review.photos?.length || 0) - 1) {
                setSelectedPhotoIndex(prev => prev !== null ? prev + 1 : prev);
            } else if (e.key === 'Escape') {
                setSelectedPhotoIndex(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPhotoIndex, review]);

    const handleGenerate = async (selectedTone: 'professional' | 'casual' | 'standard' = 'standard', selectedLength: 'short' | 'standard' = 'standard') => {
        if (!review) return;
        setIsGenerating(true);
        try {
            const generated = await reviewsService.generateReply(review, selectedTone, selectedLength);
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
        if (!review || !organizationId) return;
        setIsResolving(true);
        try {
            await reviewsService.updateReviewStatus(organizationId, review.id, 'Replied');
            setReview(prev => prev ? { ...prev, status: 'Replied' } : null);
        } catch (err) {
            console.error("Status update not fully implemented in Phase 1:", err);
        } finally {
            setIsResolving(false);
        }
    };

    const handleSave = async () => {
        if (!review || !organizationId || !draftReply) return;
        setIsSaving(true);
        try {
            await reviewsService.saveReply(organizationId, review.id, draftReply);
            setReview(prev => prev ? { ...prev, ai_reply: draftReply } : null);
        } catch (err) {
            console.error("Save reply not fully implemented in Phase 1:", err);
        } finally {
            setIsSaving(false);
        }
    };

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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // 1. Loading State
    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] bg-gray-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 mb-4"></div>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Loading review details...</p>
            </div>
        );
    }

    // 2. Error State
    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] bg-gray-50 dark:bg-slate-900 p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Failed to Load Review</h2>
                <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-8 font-medium">
                    {error.includes("404") || error.includes("not found") 
                      ? "The requested review does not exist, or you do not have permission to view it." 
                      : error}
                </p>
                <button
                    onClick={() => navigate('/reviews')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200"
                >
                    <ArrowLeft size={16} /> Back to Reviews
                </button>
            </div>
        );
    }

    // 3. Not Found (Empty) State
    if (!review) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] bg-gray-50 dark:bg-slate-900 p-8 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Review Not Found</h2>
                <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-8 font-medium">
                    The requested review could not be found.
                </p>
                <button
                    onClick={() => navigate('/reviews')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200"
                >
                    <ArrowLeft size={16} /> Back to Reviews
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/reviews')}
                        className="w-10 h-10 grid place-items-center bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95"
                        title="Back to reviews"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                                Review Details
                            </h1>
                            <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm uppercase tracking-widest">
                                {review.source}
                            </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                            View analytical insights and write AI replies
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleMarkResolved}
                        disabled={isResolving || isSaving || review.status === 'Replied'}
                        className="px-5 text-[12px] uppercase flex items-center gap-1.5 shadow-sm active:scale-95 transition-all
                            text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300
                            dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/60 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
                    >
                        {isResolving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {review.status === 'Replied' ? 'Resolved' : 'Mark Resolved'}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isResolving || !draftReply}
                        className="px-6 text-[12px] uppercase shadow-lg active:scale-95 transition-all"
                    >
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : 'Save Reply'}
                    </Button>
                </div>
            </header>

            {/* Content Container */}
            <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Review details & media */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Guest Details */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0 text-xl font-black text-[#4e80ee] dark:text-blue-400 uppercase">
                                {review.userName ? review.userName.charAt(0) : 'U'}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{review.userName || 'Guest'}</h2>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
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
                                </div>
                            </div>
                        </div>

                        {/* Review Content bubble */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative">
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

                        {/* Photos/Attachments */}
                        {review.photos && review.photos.length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-4">Attachments ({review.photos.length})</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {review.photos.map((photo, index) => (
                                        <div
                                            key={photo.id || index}
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
                        )}

                        {/* AI Reply drafting block */}
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
                                <div className="min-h-[140px] w-full p-4 bg-white/80 dark:bg-slate-800/80 border border-blue-100/50 dark:border-blue-900/50 rounded-xl text-[14px] font-medium text-gray-700 dark:text-gray-200 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all shadow-sm relative overflow-hidden">
                                    {isGenerating && (
                                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                                            <RefreshCw size={24} className="text-[#4e80ee] dark:text-blue-400 animate-spin" />
                                        </div>
                                    )}
                                    <textarea
                                        className="w-full h-full min-h-[120px] bg-transparent resize-none outline-none leading-relaxed relative z-0"
                                        placeholder="AI generated response will appear here. Click 'Generate' to draft a reply."
                                        value={draftReply}
                                        onChange={(e) => setDraftReply(e.target.value)}
                                        disabled={isGenerating || isSaving}
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    <select
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value as any)}
                                        disabled={isGenerating || isSaving}
                                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-semibold text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 outline-none"
                                        title="Reply tone"
                                    >
                                        <option value="standard">Tone: Standard</option>
                                        <option value="professional">Tone: Professional</option>
                                        <option value="casual">Tone: Casual</option>
                                    </select>
                                    <select
                                        value={replyLength}
                                        onChange={(e) => setReplyLength(e.target.value as any)}
                                        disabled={isGenerating || isSaving}
                                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-semibold text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 outline-none"
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
                                        className={`min-w-[80px] justify-center text-[12px] uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 ${isCopied ? 'bg-emerald-500 hover:bg-emerald-600 border-none text-white' : ''}`}
                                    >
                                        {isCopied ? <CheckCircle2 size={14} className="text-white" /> : <Copy size={14} />}
                                        {isCopied ? 'Copied' : 'Copy'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: AI analytical summary & categories */}
                    <div className="space-y-6">
                        
                        {/* Analytical card */}
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

                                {/* Categories */}
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest block mb-2">Topic Categories</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {review.categories && review.categories.length > 0 ? review.categories.map((cat, i) => (
                                            <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600">
                                                {cat}
                                            </span>
                                        )) : <span className="text-xs text-gray-400 dark:text-slate-500 italic">None identified</span>}
                                    </div>
                                </div>

                                {/* Key Phrases */}
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest block mb-2">Key Phrases</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {review.keyPhrases && review.keyPhrases.length > 0 ? review.keyPhrases.map((phrase, i) => (
                                            <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-[#4e80ee] border border-blue-100 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800">
                                                "{phrase}"
                                            </span>
                                        )) : <span className="text-xs text-gray-400 dark:text-slate-500 italic">None extracted</span>}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest block mb-2">AI Summary</span>
                                    <p className="text-[13px] text-gray-600 bg-gray-50 border-gray-100 dark:text-gray-300 dark:bg-slate-700 dark:border-slate-600 leading-relaxed font-medium p-3 rounded-xl border">
                                        {review.summary || "Summary not available for this review."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Technical Metadata */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                <Clock size={16} /> System Metadata
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-gray-500 font-bold dark:text-slate-400">Review ID</span>
                                    <span className="text-gray-900 bg-gray-50 border-gray-100 dark:text-white dark:bg-slate-700 dark:border-slate-600 font-mono tracking-tighter px-2 py-0.5 rounded border">{review.id}</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-gray-500 font-bold dark:text-slate-400">Language</span>
                                    <span className="text-gray-900 dark:text-white font-medium">{review.language || "English"}</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-gray-500 font-bold dark:text-slate-400">Last Scraped</span>
                                    <span className="text-gray-900 dark:text-white font-medium">{formatDate(review.scrapedAt)}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>

            {/* Lightbox attachment preview */}
            {selectedPhotoIndex !== null && review.photos && (
                <ReviewDetailLightbox
                    review={review}
                    selectedPhotoIndex={selectedPhotoIndex}
                    onClose={() => setSelectedPhotoIndex(null)}
                    onNavigate={setSelectedPhotoIndex}
                />
            )}
        </div>
    );
};

export default ReviewDetailPage;
