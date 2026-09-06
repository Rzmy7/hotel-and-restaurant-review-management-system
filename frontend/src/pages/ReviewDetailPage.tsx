import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Star, MessageSquareText, Cpu, CalendarDays,
    RefreshCw, Copy, CheckCircle2, Bot,
    ArrowLeft, ThumbsUp, Minus, ThumbsDown,
} from 'lucide-react';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { reviewsService } from '../services/reviewsService';
import { apiClient } from '../api/client';
import { ActivityMessages } from '../constants/activityMessages';
import type { Review } from '../types/reviews';
import { Button } from '../components/ui/Button';
import ReviewDetailSkeleton from './ReviewDetailSkeleton';

// ─── Helpers ───────────────────────────────────────────────────────────────
const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    const config = {
        Positive: { icon: <ThumbsUp size={12} />, bg: 'bg-emerald-100 dark:bg-emerald-900/40', fg: 'text-emerald-700 dark:text-emerald-400', label: 'Positive' },
        Negative: { icon: <ThumbsDown size={12} />, bg: 'bg-red-100 dark:bg-red-900/40', fg: 'text-red-700 dark:text-red-400', label: 'Negative' },
        Neutral:  { icon: <Minus size={12} />, bg: 'bg-slate-100 dark:bg-slate-700/50', fg: 'text-slate-700 dark:text-slate-400', label: 'Neutral' },
    };
    const s = config[sentiment as keyof typeof config] || config.Neutral;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.bg} ${s.fg}`}>
            {s.icon} {s.label}
        </span>
    );
};

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
            <Star
                key={i}
                size={16}
                className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-slate-600'}
            />
        ))}
        <span className="ml-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">{rating?.toFixed(1)}</span>
    </div>
);

// ─── Page Component ───────────────────────────────────────────────────────
const ReviewDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const org = useOrganizationStore(state => state.currentOrg);
    const organizationId = org?.id || '';

    const [review, setReview] = useState<Review | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Reply state
    const [draftReply, setDraftReply] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [tone, setTone] = useState<'professional' | 'casual' | 'standard'>('standard');
    const [replyLength, setReplyLength] = useState<'short' | 'standard'>('standard');
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

    // Fetch the review
    const fetchReview = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.get<any>(`/reviews/${id}`);
            if (data?.id) {
                setReview(data);
            } else {
                setError('Review not found.');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load review.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReview();
    }, [fetchReview]);

    // Fetch latest reply on mount
    useEffect(() => {
        if (!review?.id) return;
        const fetchReply = async () => {
            try {
                const data = await apiClient.get<any>(`/reviews/${review.id}/replies/latest`);
                if (data?.reply?.replyText) {
                    setDraftReply(data.reply.replyText);
                }
            } catch {
                // No reply exists yet — fine
            }
        };
        fetchReply();
    }, [review?.id]);

    // Generate AI reply
    const handleGenerateReply = async () => {
        if (!review) return;
        setIsGenerating(true);
        try {
            const replyText = await reviewsService.generateReply(review, tone, replyLength);
            if (replyText) {
                setDraftReply(replyText);
            }
        } catch (err: any) {
            console.error('Failed to generate reply:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    // Save reply
    const handleSaveReply = async () => {
        if (!review || !draftReply.trim()) return;
        setIsSaving(true);
        try {
            await apiClient.post(`/reviews/${review.id}/reply`, { replyText: draftReply, tone }, {
                activity: ActivityMessages.SEND_REPLY,
                showSuccess: true,
                successMessage: 'Reply saved successfully'
            });
        } catch (err: any) {
            console.error('Failed to save reply:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Copy to clipboard
    const handleCopy = () => {
        if (draftReply) {
            navigator.clipboard.writeText(draftReply);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    // ── Loading ──────────────────────────────────────────────────────────
    if (loading) {
        return <ReviewDetailSkeleton />;
    }

    // ── Error ────────────────────────────────────────────────────────────
    if (error || !review) {
        return (
            <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'Review not found.'}</p>
                    <Button onClick={() => navigate('/reviews')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back to Reviews
                    </Button>
                </div>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900">
            {/* Header bar */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-8 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate('/reviews')}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Reviews
                    </button>
                    <span className="text-sm text-gray-400 dark:text-slate-500 font-mono">
                        Review #{String(review.id).slice(0, 8)}…
                    </span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:px-8 md:py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

                    {/* ── LEFT: Review Content ─────────────────────────── */}
                    <div className="space-y-5">
                        {/* Review header card */}
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
                            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        {review.heading || review.reviewText?.slice(0, 100) || 'Review'}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        by {review.reviewerName || 'Anonymous'} · {review.source}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <SentimentBadge sentiment={review.sentiment} />
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                        review.status === 'processed'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    }`}>
                                        {review.status === 'processed' ? 'Processed' : 'Pending'}
                                    </span>
                                </div>
                            </div>

                            <StarRating rating={review.rating} />

                            <div className="flex flex-wrap items-center gap-4 mt-4 text-[13px] text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1"><CalendarDays size={13} /> {review.date || review.reviewDate || 'Unknown'}</span>
                                {review.platformReviewId && (
                                    <span className="flex items-center gap-1 font-mono text-[11px] opacity-60">
                                        ID: {review.platformReviewId}
                                    </span>
                                )}
                            </div>

                            {/* Categories / key phrases */}
                            {review.categories && Array.isArray(review.categories) && review.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                                    {review.categories.map((cat: any, i: number) => {
                                        const name = typeof cat === 'string' ? cat : cat?.name || cat;
                                        if (!name) return null;
                                        return (
                                            <span key={i} className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400">
                                                {name}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Review text */}
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Review Text</h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {review.reviewText || review.text || 'No review text available.'}
                            </div>
                        </div>

                        {/* Positive / Negative highlights */}
                        {(review.positiveText || review.negativeText) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {review.positiveText && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                                            <ThumbsUp size={14} /> Positive Highlights
                                        </h4>
                                        <p className="text-sm text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap">{review.positiveText}</p>
                                    </div>
                                )}
                                {review.negativeText && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                                            <ThumbsDown size={14} /> Areas of Concern
                                        </h4>
                                        <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">{review.negativeText}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Photos */}
                        {review.photos && review.photos.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                    Photos ({review.photos.length})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {review.photos.map((photo: any, i: number) => (
                                        <img
                                            key={i}
                                            src={photo.src || photo.url || photo}
                                            alt={photo.alt || `Photo ${i + 1}`}
                                            className="w-20 h-20 object-cover rounded-lg cursor-pointer border border-gray-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
                                            onClick={() => setSelectedPhotoIndex(i)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <Button variant="outline" onClick={() => navigate('/reviews')}>
                                <ArrowLeft size={16} className="mr-1.5" /> Back to Reviews
                            </Button>
                        </div>
                    </div>

                    {/* ── RIGHT: AI Response Editor ───────────────────────── */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 sticky top-20">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 grid place-items-center bg-violet-50 dark:bg-violet-900/40 text-violet-500 dark:text-violet-400 rounded-lg">
                                    <Bot size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white">AI Response Editor</h3>
                                    <p className="text-[11px] text-gray-400 dark:text-slate-500">{review.ai_reply ? 'Response saved' : 'Generate an AI response'}</p>
                                </div>
                            </div>

                            {/* Tone & Length selectors */}
                            <div className="flex gap-2 mb-3">
                                <select
                                    value={tone}
                                    onChange={e => setTone(e.target.value as any)}
                                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
                                >
                                    <option value="standard">Standard tone</option>
                                    <option value="professional">Professional</option>
                                    <option value="casual">Casual</option>
                                </select>
                                <select
                                    value={replyLength}
                                    onChange={e => setReplyLength(e.target.value as any)}
                                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
                                >
                                    <option value="standard">Standard length</option>
                                    <option value="short">Short</option>
                                </select>
                            </div>

                            {/* Generate button */}
                            <Button
                                className="w-full mb-3"
                                onClick={handleGenerateReply}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin mr-1.5" />
                                        Generating…
                                    </>
                                ) : (
                                    <>
                                        <Cpu size={14} className="mr-1.5" />
                                        Generate AI Response
                                    </>
                                )}
                            </Button>

                            {/* Reply textarea */}
                            <textarea
                                value={draftReply}
                                onChange={e => setDraftReply(e.target.value)}
                                placeholder="AI-generated response will appear here…"
                                rows={8}
                                className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2.5 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/30 mb-3"
                            />

                            {/* Action buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleCopy}
                                >
                                    {isCopied ? <CheckCircle2 size={14} className="mr-1 text-emerald-500" /> : <Copy size={14} className="mr-1" />}
                                    {isCopied ? 'Copied' : 'Copy'}
                                </Button>
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleSaveReply}
                                    disabled={isSaving || !draftReply.trim()}
                                >
                                    <MessageSquareText size={14} className="mr-1" />
                                    {isSaving ? 'Saving…' : 'Save Response'}
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default ReviewDetailPage;
