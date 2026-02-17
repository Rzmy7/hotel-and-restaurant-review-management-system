import { Search, Calendar, Download, Menu } from "lucide-react";


interface ReviewsHeaderProps {
  onMenuClick?: () => void;
}

const ReviewsHeader: React.FC<ReviewsHeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-white p-6 px-8 border-b border-gray-200 flex flex-col gap-5">
      {/* ROW 1: Title and Top Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex items-center justify-center rounded-md hover:bg-gray-100 transition" onClick={onMenuClick}>
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 m-0">Reviews</h1>
        </div>

        <div className="flex items-center gap-[60px]">
          <div className="relative w-[320px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              className="w-full py-2.5 px-2.5 pl-[38px] border border-gray-200 rounded-md text-sm outline-none bg-gray-50 transition-colors focus:border-blue-500 focus:bg-white"
            />
          </div>

          <button className="bg-white border border-gray-200 px-4 py-2.5 rounded-md text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-gray-300">Filters</button>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition hover:bg-gray-50 hover:border-gray-400">
            <Calendar size={16} className="text-gray-500" />
            <span>Select date range</span>
          </button>
          <button className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition hover:bg-gray-50 hover:border-gray-400">
            <Download size={16} className="text-gray-500" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ReviewsHeader;
