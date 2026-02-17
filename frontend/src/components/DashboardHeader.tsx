import { Bell, CalendarDays, Menu } from 'lucide-react';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 px-8 py-5 bg-white border-b border-gray-200">
      <div className="flex items-start gap-4">
        <button className="p-1 bg-transparent text-gray-500 hover:bg-gray-100 rounded-md transition-colors mt-0.5" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grand Plaza Hotel</h1>
          <p className="mt-1 text-xs text-gray-400">Review Management Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all">
          <CalendarDays size={16} />
          <span>Last 30 Days</span>
        </button>
        <button className="w-10 h-10 grid place-items-center bg-white border border-gray-200 rounded-full text-gray-500 hover:bg-gray-100 transition-all relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="w-10 h-10 grid place-items-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full font-bold text-base">L</div>
      </div>
    </header>
  );
};

export default DashboardHeader;
