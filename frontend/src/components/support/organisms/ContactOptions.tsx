import React from 'react';
import { Mail, MessageSquare, Phone, Clock } from 'lucide-react';

const contactOptions = [
  {
    id: 'email',
    icon: <Mail size={24} />,
    title: 'Email Support',
    description: 'Direct response within 24 hours from our expert team.',
    value: 'support@grandplazahotel.com',
    color: 'bg-blue-50 dark:bg-blue-900/20 text-[#4e80ee]',
    ring: 'ring-blue-100 dark:ring-blue-800/30'
  },
  {
    id: 'chat',
    icon: <MessageSquare size={24} />,
    title: 'Live Chat',
    description: 'Instant assistance for priority issues and technical hurdles.',
    value: 'Available 9AM - 6PM EST',
    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500',
    ring: 'ring-emerald-100 dark:ring-emerald-800/30'
  },
  {
    id: 'phone',
    icon: <Phone size={24} />,
    title: 'Enterprise Line',
    description: 'Dedicated phone support for VIP and Enterprise accounts.',
    value: '+1 (800) SYSTEM-SOS',
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
    ring: 'ring-amber-100 dark:ring-amber-800/30'
  }
];

const ContactOptions: React.FC = () => {
  return (
    <div className="grid gap-4">
      {contactOptions.map((opt) => (
        <div 
          key={opt.id}
          className="group relative p-6 rounded-3xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-100 dark:border-slate-800 flex items-center gap-5 transition-all duration-300 hover:shadow-lg hover:bg-white dark:hover:bg-slate-800"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-1 ${opt.ring} ${opt.color} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
            {opt.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-[15px] font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">
              {opt.title}
            </h4>
            <p className="text-[12px] font-medium text-gray-500 dark:text-slate-400 leading-tight">
              {opt.description}
            </p>
            <p className="mt-2 text-[13px] font-bold text-gray-700 dark:text-slate-300">
               {opt.value}
            </p>
          </div>
          
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                <Clock size={10} className="text-gray-400" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fast</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactOptions;
