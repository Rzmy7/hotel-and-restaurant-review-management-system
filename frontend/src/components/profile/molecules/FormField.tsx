import React from "react";

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  multiline?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  type = "text",
  placeholder,
  onChange,
  multiline = false,
}) => {
  const baseClasses =
    "w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#4e80ee]/20 focus:border-[#4e80ee] placeholder:text-gray-300 dark:placeholder:text-slate-600";

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={4}
          className={`${baseClasses} resize-none`}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={baseClasses}
        />
      )}
    </div>
  );
};

export default FormField;
