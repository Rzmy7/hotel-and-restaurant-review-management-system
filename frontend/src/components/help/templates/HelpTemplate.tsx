import React from "react";
import HelpHeader from "../organisms/HelpHeader";
import HelpSearch from "../molecules/HelpSearch";
import HelpCategoriesGrid from "../organisms/HelpCategoriesGrid";
import HelpTopArticles from "../organisms/HelpTopArticles";

const HelpTemplate: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-slate-900 flex flex-col">
      <HelpHeader />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 py-12 space-y-12">
        <section className="text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">
              Knowledge Base
            </h2>
            <p className="text-gray-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
              Find answers, learn strategy, and build your presence
            </p>
          </div>
          <HelpSearch onSearch={() => {}} />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-12 items-start">
          <section className="space-y-8 order-2 xl:order-1">
            <div className="flex items-center gap-4 px-2">
              <h5 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[2px] whitespace-nowrap">
                Browse by Category
              </h5>
              <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
            </div>
            <HelpCategoriesGrid />
          </section>

          <aside className="order-1 xl:order-2 space-y-8">
            <HelpTopArticles />

            <div className="bg-[#4e80ee] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-100 dark:shadow-none">
              <div className="relative z-10">
                <h4 className="text-xl font-black uppercase tracking-tight mb-2">
                  Can't find it?
                </h4>
                <p className="text-sm font-bold text-blue-100 leading-relaxed mb-6">
                  Our support team is available 24/7 to help you with any
                  issues.
                </p>
                <button className="h-12 w-full bg-white text-[#4e80ee] rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg hover:bg-blue-50 transition-all active:scale-[0.98]">
                  Contact Support
                </button>
              </div>
              <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>
          </aside>
        </div>
      </main>

      <div className="h-20 shrink-0" />
    </div>
  );
};

export default HelpTemplate;
