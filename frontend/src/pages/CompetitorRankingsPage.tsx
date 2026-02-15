// src/pages/CompetitorRankingsPage.tsx
import React, { useState } from 'react';
import { Menu, ChevronDown, ArrowLeft, Star, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CompetitorRankingsPage.css';

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
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Mock data - replace with API call later
  const rawRankings: RankingData[] = [
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
  ];

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

  return (
    <div className="page-content">
      {/* Header */}
      <header className="rankings-header">
        <div className="header-left">
          <button className="menu-btn" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div className="header-text">
            <h1>Competitor Rankings</h1>
            <p className="subtitle">Overall performance comparison</p>
          </div>
        </div>
        <div className="header-right">
          <div className="hotel-selector">
            <select value={selectedHotel} className="hotel-dropdown">
              <option value="grand-plaza">Grand Plaza Hotel</option>
            </select>
            <ChevronDown size={16} className="dropdown-icon" />
          </div>
          <div className="hotel-selector">
            <select value={selectedPeriod} className="hotel-dropdown">
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="Last Year">Last Year</option>
            </select>
            <ChevronDown size={16} className="dropdown-icon" />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="content-area">
        {/* Back Button */}
        <button className="back-btn" onClick={() => navigate('/competitors')}>
          <ArrowLeft size={18} />
          Back to Competitors
        </button>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-label">Your Current Rank</div>
            <div className="card-value rank-value">#{yourCurrentRank}</div>
          </div>

          <div className="summary-card">
            <div className="card-label">Total Competitors</div>
            <div className="card-value">{totalCompetitors}</div>
          </div>

          <div className="summary-card">
            <div className="card-label">Top Performer</div>
            <div className="card-value performer-value">
              <span className="performer-name">{topPerformer.name}</span>
              <span className="performer-rating">
                {topPerformer.avgRating} <Star size={14} fill="#FFC107" color="#FFC107" />
              </span>
            </div>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="rankings-section">
          <div className="section-header">
            <h2>Rankings Overview</h2>
            <div className="header-actions">
              <div className="sort-dropdown-wrapper">
                <select 
                  className="sort-dropdown"
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

          <div className="rankings-table-container">
            <table className="rankings-table">
              <thead>
                <tr>
                  <th className="th-rank">RANK</th>
                  <th className="th-name">ORGANIZATION NAME</th>
                  <th className="th-sortable" onClick={() => handleSort('avgRating')}>
                    <div className="th-content">
                      AVERAGE RATING
                      <ArrowUpDown size={14} className="sort-icon" />
                    </div>
                  </th>
                  <th className="th-sortable" onClick={() => handleSort('sentimentScore')}>
                    <div className="th-content">
                      SENTIMENT SCORE
                      <ArrowUpDown size={14} className="sort-icon" />
                    </div>
                  </th>
                  <th className="th-sortable" onClick={() => handleSort('reviewCount')}>
                    <div className="th-content">
                      REVIEW COUNT
                      <ArrowUpDown size={14} className="sort-icon" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((item, index) => (
                  <tr key={item.name} className={item.isYou ? 'your-row' : ''}>
                    <td className="rank-cell">#{index + 1}</td>
                    <td className="name-cell">
                      <div className="name-content">
                        <div className="name-wrapper">
                          <span className="name-text">{item.name}</span>
                          {item.isYou && <span className="you-badge">You</span>}
                        </div>
                        <div className="rating-mobile">
                          {item.avgRating} <Star size={14} fill="#FFC107" color="#FFC107" />
                        </div>
                      </div>
                    </td>
                    <td className="rating-cell">
                      <span className="rating-value">{item.avgRating}</span>
                      <Star size={14} fill="#FFC107" color="#FFC107" />
                    </td>
                    <td className="sentiment-cell">{item.sentimentScore}%</td>
                    <td className="count-cell">{item.reviewCount.toLocaleString()}</td>
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
