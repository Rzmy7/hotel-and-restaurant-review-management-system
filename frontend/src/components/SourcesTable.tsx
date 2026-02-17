import React from 'react';
import { Play, Edit2, Trash2 } from 'lucide-react';

interface Source {
  id: number;
  platform: string;
  status: 'Active' | 'Paused';
  lastSynced: string;
  schedule: string;
}

interface SourcesTableProps {
  sources: Source[];
  onEditSource: (source: Source) => void;
}

const SourcesTable = ({ sources, onEditSource }: SourcesTableProps) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source Platform</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Synced</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-b border-gray-100 transition-colors duration-200 last:border-b-0 hover:bg-gray-50">
              <td className="px-5 py-4 text-sm text-gray-800 font-medium">{source.platform}</td>
              <td className="px-5 py-4 text-sm text-gray-800">
                <span className={`inline-block px-3 py-1 rounded-xl text-xs font-semibold ${
                  source.status.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
                }`}>
                  {source.status}
                </span>
              </td>
              <td className="px-5 py-4 text-sm text-gray-500">{source.lastSynced}</td>
              <td className="px-5 py-4 text-sm text-gray-700">{source.schedule}</td>
              <td className="px-5 py-4 text-sm text-gray-800">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-transparent border border-gray-300 rounded-md text-[13px] font-medium text-blue-500 cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:border-blue-500">
                    <Play size={14} />
                    Run Now
                  </button>
                  <button 
                    className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:text-blue-500" 
                    title="Edit"
                    onClick={() => onEditSource(source)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all duration-200 hover:bg-red-50 hover:text-red-600" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SourcesTable;
