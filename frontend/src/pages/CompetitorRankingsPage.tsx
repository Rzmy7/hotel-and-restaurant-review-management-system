// src/pages/CompetitorRankingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Menu, ChevronDown, ArrowLeft, Star, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

interface CompetitorRankingsPageProps {
  toggleSidebar: () => void;
}

interface RankingData {
  rank: number;
  name: string;
  avgRating: number;
  sentimentScore: number;
  reviewCount: number;
  isYou?: boolean;
}

type SortField = 'rank' | 'avgRating' | 'sentimentScore' | 'reviewCount';
type SortDirection = 'asc' | 'desc';

const CompetitorRankingsPage: React.FC<CompetitorRankingsPageProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  
  const [selectedHotel] = useState('grand-plaza');
  const [selectedPeriod] = useState('Last 30 Days');
  const [selectedDomain] = useState('hotel');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [rawRankings, setRawRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rankings from API
  useEffect(() => {
    fetchRankings();
  }, [selectedDomain]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/competitors/rankings/all?domain=${selectedDomain}`);
      if (!response.ok) throw new Error('Failed to fetch rankings');
      const data = await response.json();
      setRawRankings(data.map((item: any) => ({
        rank: item.rank,
        name: item.name,
        avgRating: item.avgRating,
        sentimentScore: item.sentimentScore,
        reviewCount: item.reviewCount,
        isYou: item.isMyHotel
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rankings');
      console.error('Error fetching rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mock data removed - now fetching from API
  /*const rawRankings: RankingData[] = [
    {
      rank: 1,
      name: 'Royal Beach Resort',
      avgRating: 4.6,
      sentimentScore: 82,
      reviewCount: 1200,
    },
    {
      rank: 2,
      name: 'Grand Plaza Hotel',
      avgRating: 4.3,
      sentimentScore: 75,
      reviewCount: 980,
      isYou: true,
    },
    {
      rank: 3,
      name: 'Ocean View Hotel',
      avgRating: 4.1,
      sentimentScore: 71,
      reviewCount: 870,
    },
    {
      rank: 4,
      name: 'Mountain Retreat Lodge',
      avgRating: 4.0,
      sentimentScore: 68,
      reviewCount: 750,
    },
    {
      rank: 5,
      name: 'Downtown Business Inn',
      avgRating: 3.9,
      sentimentScore: 65,
      reviewCount: 620,
    },
    {
      rank: 6,
      name: 'Lakeside Resort',
      avgRating: 3.7,
      sentimentScore: 78,
      reviewCount: 540,
    },
  ];*/

  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort rankings
  const rankings = [...rawRankings].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (a[sortField] < b[sortField]) return -1 * multiplier;
    if (a[sortField] > b[sortField]) return 1 * multiplier;
    return 0;
  });

  // Calculate dynamic rank based on current sort
  const yourCurrentRank = rankings.findIndex(r => r.isYou) + 1;
  const topPerformer = rawRankings[0];
  const totalCompetitors = rawRankings.length;

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading rankings...</div>
      </div>
    );
  }

  // Show error state
  if (error || rawRankings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">{error || 'No rankings data available'}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200">
        <div className="flex items-start gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div>
            <h1 className="m-0 text-2xl font-bold text-gray-800">Competitor Rankings</h1>
            <p className="mt-1 mb-0 text-xs text-gray-400">Overall performance comparison</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={selectedHotel} className="appearance-none px-4 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm cursor-pointer hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="grand-plaza">Grand Plaza Hotel</option>
            </select>
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
          <div className="relative">
            <select value={selectedPeriod} className="appearance-none px-4 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm cursor-pointer hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="Last Year">Last Year</option>
            </select>
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Back Button */}
        <button className="flex items-center gap-2 px-4 py-2 mb-6 bg-white border border-gray-200 rounded-md text-gray-500 text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700" onClick={() => navigate('/competitors')}>
          <ArrowLeft size={18} />
          Back to Competitors
        </button>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-xs text-gray-500 mb-3 font-medium">Your Current Rank</div>
            <div className="text-4xl font-bold text-blue-500">#{yourCurrentRank}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-xs text-gray-500 mb-3 font-medium">Total Competitors</div>
            <div className="text-4xl font-bold text-gray-800">{totalCompetitors}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-xs text-gray-500 mb-3 font-medium">Top Performer</div>
            <div className="flex flex-col gap-2">
              <span className="text-lg font-semibold text-gray-800">{topPerformer.name}</span>
              <span className="flex items-center gap-1 text-sm text-gray-500 font-medium">
                {topPerformer.avgRating} <Star size={14} fill="#FFC107" color="#FFC107" />
              </span>
            </div>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 md:p-6 border-b border-gray-200 gap-3">
            <h2 className="text-lg font-semibold text-gray-800 m-0">Rankings Overview</h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex items-center gap-2">
                <select 
                  className="appearance-none px-3 py-1.5 pr-8 bg-white border border-gray-300 rounded-md text-xs text-gray-700 cursor-pointer min-w-[150px] md:min-w-[120px] transition-all hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={sortField}
                  onChange={(e) => {
                    setSortField(e.target.value as SortField);
                    setSortDirection('desc');
                  }}
                >
                  <option value="avgRating">Average Rating</option>
                  <option value="sentimentScore">Sentiment Score</option>
                  <option value="reviewCount">Review Count</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap w-20">RANK</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">ORGANIZATION NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors hover:bg-gray-100" onClick={() => handleSort('avgRating')}>
                    <div className="flex items-center gap-1.5">
                      AVERAGE RATING
                      <ArrowUpDown size={14} className="opacity-50 flex-shrink-0 hover:opacity-100" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors hover:bg-gray-100" onClick={() => handleSort('sentimentScore')}>
                    <div className="flex items-center gap-1.5">
                      SENTIMENT SCORE
                      <ArrowUpDown size={14} className="opacity-50 flex-shrink-0 hover:opacity-100" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors hover:bg-gray-100" onClick={() => handleSort('reviewCount')}>
                    <div className="flex items-center gap-1.5">
                      REVIEW COUNT
                      <ArrowUpDown size={14} className="opacity-50 flex-shrink-0 hover:opacity-100" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((item, index) => (
                  <tr key={item.name} className={`border-b border-gray-100 last:border-b-0 transition-colors ${item.isYou ? 'bg-blue-50 border-t border-b !border-blue-200 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-500 w-20">#{index + 1}</td>
                    <td className="px-6 py-4 text-sm min-w-[200px]">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-800">{item.name}</span>
                          {item.isYou && <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded">You</span>}
                        </div>
                        <div className="flex md:hidden items-center gap-1 text-xs text-gray-500">
                          {item.avgRating} <Star size={14} fill="#FFC107" color="#FFC107" />
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-800">{item.avgRating}</span>
                        <Star size={14} fill="#FFC107" color="#FFC107" />
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{item.sentimentScore}%</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{item.reviewCount.toLocaleString()}</td>
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

export default CompetitorRankingsPage;
