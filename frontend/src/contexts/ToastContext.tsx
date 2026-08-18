import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Toast, type ToastType } from '../components/shared/Toast';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);
    const [activities, setActivities] = useState<{ id: string; message: string }[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds for warnings, 3 seconds for others
        const duration = type === 'warning' ? 5000 : 3000;
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    // ── Listen for feature-limit-reached events from the API client ──
    useEffect(() => {
        const handleLimitReached = (event: Event) => {
            const customEvent = event as CustomEvent<{ message: string }>;
            const message = customEvent.detail?.message || 'Feature limit reached. Please upgrade your plan.';
            showToast(message, 'warning');
        };

        window.addEventListener('feature-limit-reached', handleLimitReached);
        return () => window.removeEventListener('feature-limit-reached', handleLimitReached);
    }, [showToast]);

    // ── Listen for Activity Notification System events ──
    useEffect(() => {
        const handleStart = (event: Event) => {
            const e = event as CustomEvent;
            setActivities(prev => {
                // Deduplicate by message title
                if (prev.some(a => a.message === e.detail.title)) return prev;
                return [...prev, { id: e.detail.id, message: e.detail.title }];
            });
        };
        const handleSuccess = (event: Event) => {
            const e = event as CustomEvent;
            setActivities(prev => prev.filter(a => a.id !== e.detail.id));
            if (e.detail.showSuccess && e.detail.title) {
                showToast(e.detail.title, 'success');
            }
        };
        const handleError = (event: Event) => {
            const e = event as CustomEvent;
            setActivities(prev => prev.filter(a => a.id !== e.detail.id));
        };

        window.addEventListener('activity-start', handleStart);
        window.addEventListener('activity-success', handleSuccess);
        window.addEventListener('activity-error', handleError);
        return () => {
            window.removeEventListener('activity-start', handleStart);
            window.removeEventListener('activity-success', handleSuccess);
            window.removeEventListener('activity-error', handleError);
        };
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            {/* Persistent Activity Indicators */}
            {activities.length > 0 && (
                <div 
                    className="fixed bottom-4 left-4 z-50 flex flex-col gap-2"
                    role="status" 
                    aria-live="polite"
                >
                    {activities.map(activity => (
                        <div key={activity.id} className="bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl shadow-blue-900/20 flex items-center gap-3 border border-slate-700/50 animate-in fade-in slide-in-from-bottom-4">
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            {activity.message}
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
