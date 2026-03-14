import React from 'react';
import SupportHeader from '../organisms/SupportHeader';
import ContactOptions from '../organisms/ContactOptions';
import SupportForm from '../organisms/SupportForm';
import { HelpCircle } from 'lucide-react';

const FAQs = [
  { q: "How do I reset my API key?", a: "You can reset your API key from the Settings > Integrations tab. Note that all existing connections will be severed." },
  { q: "What is the monthly review limit?", a: "Our Standard plan includes up to 5,000 imports per month. Enterprise accounts have unlimted access." },
  { q: "Can I connect multiple hotel sources?", a: "Yes, you can add up to 50 sources per organization in the current version." },
];

const SupportTemplate: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-slate-900 flex flex-col">
      <SupportHeader />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-12 items-start">
          <div className="space-y-12 order-2 xl:order-1">
            <SupportForm />
            
            <section className="space-y-8">
              <div className="flex items-center gap-4 px-2">
                <h5 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[2px] whitespace-nowrap">
                  Frequently Asked
                </h5>
                <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
              </div>

              <div className="grid gap-4">
                {FAQs.map((faq, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <HelpCircle size={16} className="text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <h6 className="text-[14px] font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                          {faq.q}
                        </h6>
                        <p className="text-[13px] text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-12 order-1 xl:order-2">
            <section className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <h5 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[2px] whitespace-nowrap">
                  Direct Channels
                </h5>
                <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
              </div>
              <ContactOptions />
            </section>

            <div className="p-8 rounded-[40px] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                    <h4 className="text-2xl font-black uppercase tracking-tighter mb-4 italic">Enterprise SOS</h4>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">
                        For critical infrastructure failure or data breach reports, please use our 24/7 priority line.
                    </p>
                    <button className="h-14 w-full bg-red-500 text-white rounded-2xl font-black text-[13px] uppercase tracking-[2px] shadow-lg shadow-red-900/20 hover:bg-red-600 transition-all active:scale-[0.98]">
                        Critical Signal
                    </button>
                </div>
                {/* Decorative mesh */}
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
            </div>
          </aside>
        </div>
      </main>

      <div className="h-20 shrink-0" />
    </div>
  );
};

export default SupportTemplate;
