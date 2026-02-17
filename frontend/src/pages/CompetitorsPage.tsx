// src/pages/CompetitorsPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, TrendingUp, Plus, Star, Trash2, ChevronDown } from 'lucide-react';

interface CompetitorsPageProps {
  toggleSidebar: () => void;
}

interface Competitor {
  id: number;
  name: string;
  location: string;
  avgRating: number;
  sentimentScore: number;
  reviewCount: number;
}

const CompetitorsPage: React.FC<CompetitorsPageProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState('hotel');
  const [competitors] = useState<Competitor[]>([
    {
      id: 1,
      name: 'Luxury Grand Resort',
      location: 'Downtown',
      avgRating: 4.7,
      sentimentScore: 89,
      reviewCount: 2847,
    },
    {
      id: 2,
      name: 'Royal Beach Resort',
      location: 'Beachfront',
      avgRating: 4.6,
      sentimentScore: 88,
      reviewCount: 2156,
    },
    {
      id: 3,
      name: 'Seaside Paradise Inn',
      location: 'Coastal Area',
      avgRating: 4.3,
      sentimentScore: 82,
      reviewCount: 1654,
    },
    {
      id: 4,
      name: 'Mountain View Lodge',
      location: 'Hillside',
      avgRating: 4.2,
      sentimentScore: 80,
      reviewCount: 1432,
    },
  ]);

  const handleCompare = (competitorId: number) => {
    // Map competitor IDs to slugs for URL
    const competitorMap: { [key: number]: string } = {
      1: 'luxury-grand',
      2: 'royal-beach',
      3: 'seaside-paradise',
      4: 'mountain-view',
    };
    const competitorSlug = competitorMap[competitorId];
    navigate(`/competitors/compare?id=${competitorSlug}`);
  };

  const handleDelete = (competitorId: number) => {
    console.log('Delete competitor:', competitorId);
    // Add delete logic
  };

  const handleAddCompetitor = () => {
    console.log('Add new competitor');
    // Add modal logic
  };

  const handleViewRankings = () => {
    navigate('/competitors/rankings');
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200">
        <div className="flex items-start gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div>
            <h1 className="m-0 text-2xl font-bold text-gray-800">Competitors</h1>
            <p className="mt-1 mb-0 text-xs text-gray-400">Manage your competitor list</p>
          </div>
        </div>
        <div className="relative">
          <select 
            value={selectedDomain} 
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="appearance-none px-4 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm cursor-pointer hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="hotel">Hotel</option>
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Cafe</option>
            <option value="resort">Resort</option>
            <option value="spa">Spa</option>
          </select>
          <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 md:p-6 border-b border-gray-200 gap-3">
            <h2 className="text-lg font-semibold text-gray-800 m-0">Competitor List</h2>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400" onClick={handleViewRankings}>
                <TrendingUp size={18} />
                View Rankings
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 border border-blue-500 rounded-lg text-sm font-medium text-white transition-all hover:bg-blue-600" onClick={handleAddCompetitor}>
                <Plus size={18} />
                Add Competitor
              </button>
            </div>
          </div>

          {/* Competitors Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">COMPETITOR NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LOCATION</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">AVG RATING</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SENTIMENT SCORE</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">REVIEW COUNT</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((competitor) => (
                  <tr key={competitor.id} className="border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{competitor.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{competitor.location}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-800">{competitor.avgRating}</span>
                        <Star size={16} fill="#FFC107" color="#FFC107" />
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{competitor.sentimentScore}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{competitor.reviewCount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg transition-all hover:bg-blue-600"
                          onClick={() => handleCompare(competitor.id)}
                        >
                          Compare
                        </button>
                        <button 
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleDelete(competitor.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorsPage;
