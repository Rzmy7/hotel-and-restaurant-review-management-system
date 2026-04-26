import React, { useState } from "react";
import { Send, AlertCircle } from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";

const SupportForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    showToast("Support ticket submitted successfully!", "success");
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm">
      <div className="mb-8">
        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
          Open a Support Ticket
        </h3>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
          We'll get back to you across your registered email address
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              Issue Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Scraper connection failure"
              className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#4e80ee]/20 focus:border-[#4e80ee] placeholder:text-gray-300"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              Urgency Level
            </label>
            <select className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#4e80ee]/20 focus:border-[#4e80ee] appearance-none">
              <option>General Inquiry</option>
              <option>Technical Issue</option>
              <option>Account Access</option>
              <option>High Priority / System Down</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">
            Detailed Description
          </label>
          <textarea
            rows={6}
            placeholder="Please provide as much detail as possible, including source URLs if applicable..."
            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#4e80ee]/20 focus:border-[#4e80ee] placeholder:text-gray-300 resize-none"
            required
          />
        </div>

        <div className="p-4 rounded-2xl bg-[#4e80ee]/5 border border-[#4e80ee]/10 flex items-start gap-4">
          <AlertCircle size={20} className="text-[#4e80ee] shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 leading-relaxed">
            Our AI Support Assistant may suggest relevant documentation while
            you wait for a human agent. Please check your dashboard
            notifications.
          </p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-8 bg-[#4e80ee] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {isSubmitting ? "Submitting Signal..." : "Send Message"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupportForm;
