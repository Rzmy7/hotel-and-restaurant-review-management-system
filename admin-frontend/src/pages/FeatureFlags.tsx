import React, { useEffect, useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { ToggleSwitch } from '../components/ToggleSwitch';
import FeatureFlagsSkeleton from './FeatureFlagsSkeleton';
import { fetchFeatureFlags } from '../services/mockService';
import { featureFlagsService } from '../services/featureFlagsService';
import { faqService, type FAQItem } from '../services/faqService';
import type { FeatureFlag } from '../types';
import { 
    Flag, 
    HelpCircle, 
    Plus, 
    Pencil, 
    Trash2, 
    Sparkles, 
    X, 
    Layers,
    AlertCircle 
} from 'lucide-react';

export const FeatureFlags: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'flags' | 'faqs'>('flags');

    // Feature Flags State
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [flagsLoading, setFlagsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // FAQs State
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [faqsLoading, setFaqsLoading] = useState(true);
    const [faqSearch, setFaqSearch] = useState('');

    // FAQ Modal State
    const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
    const [faqForm, setFaqForm] = useState({
        question: '',
        answer: '',
        sort_order: 0,
        is_active: true,
        is_platform_question: false,
    });
    const [autoFillingPlatforms, setAutoFillingPlatforms] = useState(false);
    const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSavingFaq, setIsSavingFaq] = useState(false);

    // Delete confirmation state
    const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load Feature Flags
    useEffect(() => {
        const loadFlags = async () => {
            try {
                const data = await featureFlagsService.getFeatureFlags();
                setFlags(data);
            } catch {
                const fallback = await fetchFeatureFlags();
                setFlags(fallback);
            }
            setFlagsLoading(false);
        };
        loadFlags();
    }, []);

    // Load FAQs
    const loadFaqs = async () => {
        setFaqsLoading(true);
        try {
            const data = await faqService.getFaqs();
            setFaqs(data);
        } catch (error) {
            console.error('Failed to load FAQs:', error);
        } finally {
            setFaqsLoading(false);
        }
    };

    useEffect(() => {
        loadFaqs();
    }, []);

    // Feature Flag Toggle
    const toggleStatus = async (id: string) => {
        const currentFlag = flags.find((flag) => flag.id === id);
        if (!currentFlag) return;

        const nextStatus = currentFlag.status === 'Enabled' ? 'Disabled' : 'Enabled';
        setFlags(prevFlags => prevFlags.map(flag =>
            flag.id === id ? { ...flag, status: nextStatus } : flag
        ));

        try {
            const updated = await featureFlagsService.updateFeatureFlag(currentFlag.key, {
                status: nextStatus,
                ...(currentFlag.limit ? { limit: currentFlag.limit } : {}),
            });
            setFlags(prevFlags => prevFlags.map(flag => (flag.id === id ? updated : flag)));
        } catch {
            setFlags(prevFlags => prevFlags.map(flag =>
                flag.id === id ? { ...flag, status: currentFlag.status } : flag
            ));
        }
    };

    // Open Modal for Create or Edit
    const handleOpenCreateModal = () => {
        setEditingFaq(null);
        setFaqForm({
            question: '',
            answer: '',
            sort_order: faqs.length + 1,
            is_active: true,
            is_platform_question: false,
        });
        setModalError(null);
        setAutoFillMessage(null);
        setIsFaqModalOpen(true);
    };

    const handleOpenEditModal = (faq: FAQItem) => {
        setEditingFaq(faq);
        setFaqForm({
            question: faq.question,
            answer: faq.answer,
            sort_order: faq.sort_order,
            is_active: faq.is_active,
            is_platform_question: Boolean(faq.is_platform_question),
        });
        setModalError(null);
        setAutoFillMessage(null);
        setIsFaqModalOpen(true);
    };

    // Auto-fill active platforms helper
    const handleAutoFillPlatforms = async () => {
        setAutoFillingPlatforms(true);
        setAutoFillMessage(null);
        setModalError(null);
        try {
            const res = await faqService.getActivePlatforms();
            setFaqForm(prev => ({
                ...prev,
                question: prev.question.trim() ? prev.question : "Which platforms do you support?",
                answer: res.suggested_answer,
                is_platform_question: true,
            }));
            setAutoFillMessage(`Auto-filled with ${res.platforms.length} active platforms: ${res.formatted_list}`);
        } catch (err) {
            setModalError('Failed to fetch active platforms from backend.');
        } finally {
            setAutoFillingPlatforms(false);
        }
    };

    // Save FAQ (Create or Update)
    const handleSaveFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!faqForm.question.trim()) {
            setModalError('Question is required.');
            return;
        }
        if (!faqForm.answer.trim()) {
            setModalError('Answer is required.');
            return;
        }

        setIsSavingFaq(true);
        setModalError(null);

        try {
            if (editingFaq) {
                const updated = await faqService.updateFaq(editingFaq.id, faqForm);
                setFaqs(prev => prev.map(f => (f.id === editingFaq.id ? updated : f)));
            } else {
                const created = await faqService.createFaq(faqForm);
                setFaqs(prev => [...prev, created]);
            }
            setIsFaqModalOpen(false);
        } catch (err: any) {
            setModalError(err.message || 'Failed to save FAQ.');
        } finally {
            setIsSavingFaq(false);
        }
    };

    // Quick toggle FAQ active status
    const handleToggleFaqActive = async (faq: FAQItem) => {
        const nextState = !faq.is_active;
        setFaqs(prev => prev.map(f => (f.id === faq.id ? { ...f, is_active: nextState } : f)));
        try {
            await faqService.updateFaq(faq.id, { is_active: nextState });
        } catch {
            setFaqs(prev => prev.map(f => (f.id === faq.id ? { ...f, is_active: faq.is_active } : f)));
        }
    };

    // Delete FAQ
    const handleDeleteFaq = async () => {
        if (!deletingFaqId) return;
        setIsDeleting(true);
        try {
            await faqService.deleteFaq(deletingFaqId);
            setFaqs(prev => prev.filter(f => f.id !== deletingFaqId));
            setDeletingFaqId(null);
        } catch (err) {
            console.error('Failed to delete FAQ:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    if (flagsLoading && activeTab === 'flags') {
        return <FeatureFlagsSkeleton />;
    }

    const filteredFlags = flags.filter(flag =>
        flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-4 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-slate-700 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Feature Flags &amp; FAQs
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Control runtime feature toggles and manage customer-facing landing page FAQs.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 self-start sm:self-auto">
                    <button
                        onClick={() => setActiveTab('flags')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === 'flags'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <Flag size={16} />
                        <span>Feature Flags</span>
                        <span className="ml-1 text-xs bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            {flags.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('faqs')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === 'faqs'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <HelpCircle size={16} />
                        <span>FAQs</span>
                        <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {faqs.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* TAB 1: FEATURE FLAGS */}
            {activeTab === 'flags' && (
                <div className="space-y-4 animate-fadeIn">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search feature flags..."
                    />

                    <div className="space-y-3">
                        {filteredFlags.map((flag) => (
                            <div 
                                key={flag.id} 
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 flex items-center justify-between hover:shadow-md transition-shadow"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{flag.name}</h3>
                                        <code className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                                            {flag.key}
                                        </code>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-slate-400">{flag.description}</p>
                                </div>
                                <div className="flex items-center gap-4 ml-4">
                                    <div className="flex items-center gap-2">
                                        <ToggleSwitch
                                            checked={flag.status === 'Enabled'}
                                            onChange={() => toggleStatus(flag.id)}
                                        />
                                        <span className={`text-sm font-medium min-w-[60px] transition-colors ${
                                            flag.status === 'Enabled' ? 'text-blue-600 font-semibold' : 'text-gray-500 dark:text-slate-400'
                                        }`}>
                                            {flag.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: FAQS MANAGEMENT */}
            {activeTab === 'faqs' && (
                <div className="space-y-4 animate-fadeIn">
                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-80">
                            <SearchBar
                                value={faqSearch}
                                onChange={setFaqSearch}
                                placeholder="Search questions or answers..."
                            />
                        </div>
                        <button
                            onClick={handleOpenCreateModal}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow transition-all"
                        >
                            <Plus size={18} />
                            <span>Add New FAQ</span>
                        </button>
                    </div>

                    {/* FAQs List */}
                    {faqsLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : filteredFaqs.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
                            <HelpCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No FAQs found</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-4">
                                {faqSearch ? 'Try a different search query.' : 'Get started by creating the first FAQ.'}
                            </p>
                            {!faqSearch && (
                                <button
                                    onClick={handleOpenCreateModal}
                                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                                >
                                    <Plus size={16} /> Add FAQ
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFaqs.map((faq) => (
                                <div
                                    key={faq.id}
                                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                                >
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0 mt-0.5">
                                            #{faq.sort_order}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                                                    {faq.question}
                                                </h3>
                                                {faq.is_platform_question && (
                                                    <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                                                        <Layers size={12} />
                                                        <span>Platform Auto-Sync</span>
                                                    </span>
                                                )}
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                    faq.is_active 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                        : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                                                }`}>
                                                    {faq.is_active ? 'Active' : 'Hidden'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                                                {faq.answer}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleFaqActive(faq)}
                                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                                faq.is_active
                                                    ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {faq.is_active ? 'Deactivate' : 'Activate'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(faq)}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 dark:hover:text-blue-400 rounded-lg transition-colors"
                                            title="Edit FAQ"
                                        >
                                            <Pencil size={17} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setDeletingFaqId(faq.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 dark:hover:text-red-400 rounded-lg transition-colors"
                                            title="Delete FAQ"
                                        >
                                            <Trash2 size={17} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* CREATE / EDIT FAQ MODAL */}
            {isFaqModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsFaqModalOpen(false)}
                    />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-gray-200 dark:border-slate-700 animate-fadeInUp">
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <HelpCircle className="text-blue-600" size={20} />
                                {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                            </h2>
                            <button
                                onClick={() => setIsFaqModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {modalError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        {autoFillMessage && (
                            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm rounded-xl flex items-center gap-2">
                                <Sparkles size={16} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                                <span>{autoFillMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveFaq} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                    Question <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={faqForm.question}
                                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                                    placeholder="e.g. Which platforms do you support?"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                                        Answer <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAutoFillPlatforms}
                                        disabled={autoFillingPlatforms}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 transition-colors"
                                        title="Query backend active platforms and insert formatted answer"
                                    >
                                        <Sparkles size={13} />
                                        <span>{autoFillingPlatforms ? 'Fetching...' : 'Auto-fill with Active Platforms'}</span>
                                    </button>
                                </div>
                                <textarea
                                    rows={4}
                                    value={faqForm.answer}
                                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                                    placeholder="Provide the answer here. Tip: Use {platforms} to dynamically embed active platforms in real-time."
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                    Tip: You can type <code className="bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded text-blue-600 font-mono">&#123;platforms&#125;</code> and the server will automatically resolve active platform names dynamically!
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                        Display Order
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={faqForm.sort_order}
                                        onChange={(e) => setFaqForm({ ...faqForm, sort_order: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </div>

                                <div className="flex flex-col justify-end space-y-2">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={faqForm.is_active}
                                            onChange={(e) => setFaqForm({ ...faqForm, is_active: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                                            Visible on Landing Page
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={faqForm.is_platform_question}
                                            onChange={(e) => setFaqForm({ ...faqForm, is_platform_question: e.target.checked })}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                                            Supported Platforms Question
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsFaqModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingFaq}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
                                >
                                    {isSavingFaq ? 'Saving...' : editingFaq ? 'Save Changes' : 'Create FAQ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingFaqId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setDeletingFaqId(null)}
                    />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700 animate-fadeInUp">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete FAQ?</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
                            Are you sure you want to delete this FAQ? This question will be permanently removed from the public landing page.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeletingFaqId(null)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteFaq}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete FAQ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
