import React from 'react';
import { Card } from '../ui/Card';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, description }) => {
    return (
        <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6 selection:bg-blue-100 selection:text-blue-900 overflow-y-auto">
            <div className="w-full max-w-[440px] my-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="p-8 md:p-10 shadow-2xl shadow-blue-500/5 my-8">
                    <div className="space-y-2 mb-8 text-center">
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                                {description}
                            </p>
                        )}
                    </div>
                    {children}
                </Card>
            </div>
        </div>
    );
};
