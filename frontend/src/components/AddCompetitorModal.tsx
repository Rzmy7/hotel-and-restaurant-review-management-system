import React from 'react';
import { X, Star } from 'lucide-react';

interface AvailableCompetitor {
  id: number;
  name: string;
  location: string;
  avgRating: number;
}

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompetitor: (competitorId: number) => void;
  availableCompetitors: AvailableCompetitor[];
}

const AddCompetitorModal: React.FC<AddCompetitorModalProps> = ({
  isOpen,
  onClose,
  onAddCompetitor,
  availableCompetitors,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-start px-8 pt-6 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">Competitors</h2>
            <p className="mt-1 mb-0 text-sm text-gray-400">Manage your competitor list</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-8 py-6">
          {availableCompetitors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No competitors available to add</p>
              <p className="text-gray-400 text-sm mt-2">All competitors are already being tracked</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-0 pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">COMPETITOR NAME</th>
                  <th className="px-4 pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">LOCATION</th>
                  <th className="px-4 pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">AVG RATING</th>
                  <th className="px-4 pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {availableCompetitors.map((competitor, index) => (
                  <tr key={competitor.id} className={index < availableCompetitors.length - 1 ? "border-b border-gray-100" : ""}>
                    <td className="px-0 py-5 text-sm font-semibold text-gray-800">{competitor.name}</td>
                    <td className="px-4 py-5 text-sm text-gray-500">{competitor.location}</td>
                    <td className="px-4 py-5 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-gray-800">{competitor.avgRating}</span>
                        <Star size={16} fill="#FFC107" color="#FFC107" />
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <button 
                        className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg transition-all hover:bg-blue-600"
                        onClick={() => onAddCompetitor(competitor.id)}
                      >
                        ADD
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        
      </div>
    </div>
  );
};

export default AddCompetitorModal;
