import React from 'react';
import { Lock } from 'lucide-react';

interface FormFieldProps {
    label: string;
    name: string;
    value: string;
    type?: string;
    placeholder?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    multiline?: boolean;
    readOnly?: boolean;
    helperText?: string;
}

const FormField: React.FC<FormFieldProps> = ({
    label,
    name,
    value,
    type = 'text',
    placeholder,
    onChange,
    multiline = false,
    readOnly = false,
    helperText,
}) => {
    const baseClasses = "w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#4e80ee]/20 focus:border-[#4e80ee] placeholder:text-gray-300 dark:placeholder:text-slate-600";
    const readOnlyClasses = "cursor-not-allowed select-text bg-gray-50/80 dark:bg-slate-800/30 text-gray-500 dark:text-slate-400 border-gray-100 dark:border-slate-800/60 focus:ring-0 focus:border-gray-100 dark:focus:border-slate-800";
    
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                    {label}
                </label>
                {readOnly && (
                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 bg-gray-100/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
                        <Lock size={10} /> Read-only
                    </span>
                )}
            </div>
            {multiline ? (
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={4}
                    readOnly={readOnly}
                    className={`${baseClasses} ${readOnly ? readOnlyClasses : ''} resize-none`}
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    className={`${baseClasses} ${readOnly ? readOnlyClasses : ''}`}
                />
            )}
            {helperText && (
                <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 ml-1">{helperText}</p>
            )}
        </div>
    );
};

export default FormField;
