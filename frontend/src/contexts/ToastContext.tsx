import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Toast, type ToastType } from '../components/shared/Toast';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);

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
