import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Play, RotateCcw, Eye, Settings } from 'lucide-react';
import { fetchScrapingStats, fetchScrapingPlatforms, fetchScrapingJobs } from '../services/mockService';
import type { ScrapingStats, ScrapingPlatform, ScrapingJob } from '../types';
import './Scraping.css';

export const Scraping: React.FC = () => {
    const [stats, setStats] = useState<ScrapingStats | null>(null);
    const [platforms, setPlatforms] = useState<ScrapingPlatform[]>([]);
    const [jobs, setJobs] = useState<ScrapingJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [globalFrequency, setGlobalFrequency] = useState('Daily (24h)');

    useEffect(() => {
        const loadData = async () => {
            const [statsData, platformsData, jobsData] = await Promise.all([
                fetchScrapingStats(),
                fetchScrapingPlatforms(),
                fetchScrapingJobs()
            ]);
            setStats(statsData);
            setPlatforms(platformsData);
            setJobs(jobsData);
            setLoading(false);
        };
        loadData();
    }, []);

    const togglePlatform = (id: string) => {
        setPlatforms(prev => prev.map(p =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
        ));
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toLocaleString();
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Running': return 'status-badge running';
            case 'Completed': return 'status-badge completed';
            case 'Failed': return 'status-badge failed';
            default: return 'status-badge';
        }
    };

    if (loading) return <div className="scraping-loading">Loading...</div>;

    return (
        <div className="scraping-container">
            {/* Stats Cards */}
            <div className="scraping-stats-grid">
                <div className="scraping-stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Active Jobs</span>
                        <div className="stat-icon blue">
                            <Play size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{stats?.activeJobs}</div>
                    <div className="stat-change positive">+{stats?.activeJobsChange} since last hour</div>
                </div>

                <div className="scraping-stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Completed Today</span>
                        <div className="stat-icon green">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div className="stat-value">{stats?.completedToday.toLocaleString()}</div>
                    <div className="stat-subtext">{stats?.successRate}% success rate</div>
                </div>

                <div className="scraping-stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Failed Jobs</span>
                        <div className="stat-icon red">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                    </div>
                    <div className="stat-value">{stats?.failedJobs}</div>
                    <div className="stat-change negative">Requires attention</div>
                </div>

                <div className="scraping-stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Reviews Ingested</span>
                        <div className="stat-icon purple">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </div>
                    </div>
                    <div className="stat-value">{formatNumber(stats?.reviewsIngested || 0)}</div>
                    <div className="stat-change positive">+{stats?.reviewsChange}% vs last week</div>
                </div>
            </div>

            {/* Platform Configuration */}
            <div className="platform-config-section">
                <div className="platform-config-header">
                    <div>
                        <h2 className="section-title">Platform Configuration</h2>
                        <p className="section-subtitle">Configure scraper status and frequency settings for supported platforms.</p>
                    </div>
                    <div className="frequency-selector">
                        <span className="frequency-label">Global Frequency:</span>
                        <select 
                            value={globalFrequency} 
                            onChange={(e) => setGlobalFrequency(e.target.value)}
                            className="frequency-dropdown"
                        >
                            <option>Daily (24h)</option>
                            <option>Hourly</option>
                            <option>Every 6 hours</option>
                            <option>Every 12 hours</option>
                            <option>Weekly</option>
                        </select>
                    </div>
                </div>

                <div className="platforms-grid">
                    {platforms.map(platform => (
                        <div key={platform.id} className={`platform-card ${platform.status === 'maintenance' ? 'maintenance' : ''}`}>
                            <div className="platform-icon" style={{ backgroundColor: platform.color }}>
                                {platform.icon}
                            </div>
                            <div className="platform-info">
                                <span className="platform-name">{platform.name}</span>
                                <span className="platform-status">
                                    {platform.status === 'maintenance' ? 'Maintenance Mode' : `Last run: ${platform.lastRun}`}
                                </span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    className="toggle-input"
                                    checked={platform.enabled}
                                    onChange={() => togglePlatform(platform.id)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                            <button className="platform-settings-btn">
                                <Settings size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Job Status Table */}
            <div className="job-status-section">
                <div className="job-status-header">
                    <div>
                        <h2 className="section-title">Job Status Table</h2>
                        <p className="section-subtitle">Real-time monitoring of all active and recent scraping jobs.</p>
                    </div>
                    <div className="job-actions">
                        <div className="job-search-wrapper">
                            <Search size={16} className="job-search-icon" />
                            <input
                                type="text"
                                placeholder="Search Job ID or Org..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="filter-btn">
                            <Filter size={16} />
                            Filter
                        </button>
                        <button className="refresh-btn">
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="job-table-container">
                    <table className="job-table">
                        <thead>
                            <tr>
                                <th>JOB ID</th>
                                <th>PLATFORM</th>
                                <th>ORGANIZATION</th>
                                <th>STATUS</th>
                                <th>START TIME</th>
                                <th>DURATION</th>
                                <th>REVIEWS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map(job => (
                                <tr key={job.id}>
                                    <td className="job-id">{job.jobId}</td>
                                    <td>
                                        <div className="platform-cell">
                                            <div className="platform-icon-small" style={{ backgroundColor: job.platformColor }}>
                                                {job.platformIcon}
                                            </div>
                                            <span>{job.platform}</span>
                                        </div>
                                    </td>
                                    <td>{job.organization}</td>
                                    <td>
                                        <span className={getStatusBadgeClass(job.status)}>
                                            {job.status === 'Running' && <span className="status-dot"></span>}
                                            {job.status}
                                        </span>
                                    </td>
                                    <td>{job.startTime}</td>
                                    <td>{job.duration}</td>
                                    <td>{job.reviews !== null ? job.reviews : '--'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            {job.status === 'Running' && (
                                                <button className="action-btn pause">PAUSE</button>
                                            )}
                                            {job.status === 'Failed' && (
                                                <>
                                                    <button className="action-btn retry">RETRY</button>
                                                    <button className="action-btn-icon">
                                                        <RotateCcw size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {job.status === 'Completed' && (
                                                <button className="action-btn-icon">
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer">
                    <span className="showing-text">Showing 1 to 5 of 128 jobs</span>
                    <div className="pagination">
                        <button className="page-btn" disabled>Previous</button>
                        <button className="page-btn active">1</button>
                        <button className="page-btn">2</button>
                        <button className="page-btn">3</button>
                        <span className="page-ellipsis">...</span>
                        <button className="page-btn">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
