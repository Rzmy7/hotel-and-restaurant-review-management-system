import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    className,
    size = 'md',
}) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
        full: "max-w-[95vw] h-[95vh]",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div
                className={cn(
                    "w-full bg-white flex flex-col rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh]",
                    sizes[size],
                    className
                )}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to backdrop
            >
                {/* Header */}
                {(title || description) && (
                    <div className="flex items-start justify-between px-8 py-6 border-b border-gray-100 bg-white/80 sticky top-0 z-10 backdrop-blur-md">
                        <div>
                            {title && <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>}
                            {description && <p className="mt-1 text-[13px] text-gray-500 font-medium">{description}</p>}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors bg-white border border-gray-100 shadow-sm flex-shrink-0"
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Without Header but still need close button */}
                {!title && !description && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-8 z-20 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors bg-white/80 backdrop-blur border border-gray-100 shadow-sm"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 px-8 border-t border-gray-100 bg-gray-50/50 mt-auto">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
