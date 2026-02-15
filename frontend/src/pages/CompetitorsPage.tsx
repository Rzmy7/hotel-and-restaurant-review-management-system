// src/pages/CompetitorsPage.tsx
import React, { useState } from 'react';
import { Menu, TrendingUp, Plus, Star, Trash2 } from 'lucide-react';
import './CompetitorsPage.css';

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
    console.log('Compare competitor:', competitorId);
    // Add comparison logic
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
    console.log('View rankings');
    // Add view rankings logic
  };

  return (
    <div className="page-content">
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <button className="menu-btn" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div className="header-text">
            <h1>Competitors</h1>
            <p className="subtitle">Manage your competitor list</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="content-area">
        <div className="competitors-container">
          {/* Section Header */}
          <div className="competitors-header">
            <h2>Competitor List</h2>
            <div className="header-actions">
              <button className="btn-outline" onClick={handleViewRankings}>
                <TrendingUp size={18} />
                View Rankings
              </button>
              <button className="btn-primary" onClick={handleAddCompetitor}>
                <Plus size={18} />
                Add Competitor
              </button>
            </div>
          </div>

          {/* Competitors Table */}
          <div className="competitors-table-container">
            <table className="competitors-table">
              <thead>
                <tr>
                  <th>COMPETITOR NAME</th>
                  <th>LOCATION</th>
                  <th>AVG RATING</th>
                  <th>SENTIMENT SCORE</th>
                  <th>REVIEW COUNT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((competitor) => (
                  <tr key={competitor.id}>
                    <td className="competitor-name">{competitor.name}</td>
                    <td className="location">{competitor.location}</td>
                    <td className="rating">
                      <span className="rating-value">{competitor.avgRating}</span>
                      <Star size={16} className="star-icon" fill="#FFC107" color="#FFC107" />
                    </td>
                    <td className="sentiment">{competitor.sentimentScore}%</td>
                    <td className="review-count">{competitor.reviewCount.toLocaleString()}</td>
                    <td className="actions">
                      <button 
                        className="btn-compare"
                        onClick={() => handleCompare(competitor.id)}
                      >
                        Compare
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(competitor.id)}
                      >
                        <Trash2 size={16} />
                      </button>
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
