import { Bell, CalendarDays, Menu } from 'lucide-react';


interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200 max-md:flex-col max-md:items-start max-md:gap-4 transition-all">
      <div className="flex items-start gap-4">
        <button className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex items-center justify-center rounded-md hover:bg-gray-100 transition mt-0.5" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="m-0 text-2xl font-semibold text-gray-900">Grand Plaza Hotel</h1>
          <p className="mt-1 text-[13px] text-gray-400">Review Management Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3 max-md:w-full max-md:justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer transition hover:bg-gray-50 hover:border-gray-400">
          <CalendarDays size={16} />
          <span>Last 30 Days</span>
        </button>
        <button className="w-10 h-10 grid place-items-center bg-white border border-gray-200 rounded-full text-gray-500 cursor-pointer relative transition hover:bg-gray-100 after:content-[''] after:absolute after:top-2 after:right-2 after:w-2 after:h-2 after:bg-red-500 after:rounded-full after:border-2 after:border-white">
          <Bell size={18} />
        </button>
        <div className="w-10 h-10 grid place-items-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full font-bold text-base">L</div>
      </div>
    </header>
  );
};

export default DashboardHeader;
