import React, { useState } from 'react';
import { 
    Sparkles, 
    Database, 
    Settings2, 
    RefreshCw, 
    ChevronDown
} from 'lucide-react';

// Types
interface EmbeddingJob {
    id: string;
    jobId: string;
    type: 'Review' | 'Regulation';
    status: 'Completed' | 'Failed' | 'Running';
    progress: number;
    duration: string;
    timestamp: string;
}

interface VectorDbStats {
    totalVectors: number;
    namespace: string;
    lastSync: string;
    isHealthy: boolean;
}

interface SimilarityThresholds {
    oneWord: number;
    twoWords: number;
    threeOrMore: number;
}

// Mock data
const mockVectorDb: VectorDbStats = {
    totalVectors: 842109,
    namespace: 'lethys-prod-v1',
    lastSync: '2 mins ago',
    isHealthy: true,
};

const mockJobs: EmbeddingJob[] = [
    { id: '1', jobId: '#job_9823', type: 'Review', status: 'Completed', progress: 100, duration: '2.4s', timestamp: 'Just now' },
    { id: '2', jobId: '#job_9822', type: 'Regulation', status: 'Completed', progress: 100, duration: '0.3s', timestamp: '5 mins ago' },
    { id: '3', jobId: '#job_9821', type: 'Review', status: 'Failed', progress: 45, duration: '10.1s', timestamp: '1 hour ago' },
    { id: '4', jobId: '#job_9820', type: 'Regulation', status: 'Running', progress: 67, duration: '-', timestamp: '2 hours ago' },
];

export const Embeddings: React.FC = () => {
    const [modelName, setModelName] = useState('Google Gemini');
    const [thresholds, setThresholds] = useState<SimilarityThresholds>({
        oneWord: 0.85,
        twoWords: 0.75,
        threeOrMore: 0.65,
    });
    const [vectorDb] = useState<VectorDbStats>(mockVectorDb);
    const [jobs] = useState<EmbeddingJob[]>(mockJobs);

    const handleResetThresholds = () => {
        setThresholds({ oneWord: 0.85, twoWords: 0.75, threeOrMore: 0.65 });
    };

    return (
        <div className="space-y-6 pt-4">
            {/* Embedding Model */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-blue-500" />
                        <h3 className="text-base font-semibold text-gray-900">Embedding Model</h3>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                        Active
                    </span>
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Model Name</label>
                    <div className="relative">
                        <select
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm text-gray-900 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>Google Gemini</option>
                            <option>MiniLM</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <p className="text-xs text-gray-500">
                        Select the embedding model used for vectorizing content. Changing this may require re-indexing.
                    </p>
                </div>
            </div>

            {/* Vector Database & Similarity Thresholds Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vector Database */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Database size={20} className="text-blue-500" />
                            <h3 className="text-base font-semibold text-gray-900">Vector Database</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-sm text-green-600 font-medium">Healthy</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Vectors</div>
                            <div className="text-xl font-bold text-gray-900">{vectorDb.totalVectors.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Namespace</div>
                            <div className="text-xl font-bold text-gray-900">{vectorDb.namespace}</div>
                        </div>
                    </div>

                    {/* Last Sync & Re-index */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Last sync: <span className="text-gray-700">{vectorDb.lastSync}</span>
                        </span>
                        <button className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                            <RefreshCw size={16} />
                            Re-index
                        </button>
                    </div>
                </div>

                {/* Similarity Thresholds */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Settings2 size={20} className="text-blue-500" />
                            <h3 className="text-base font-semibold text-gray-900">Similarity Thresholds</h3>
                        </div>
                        <button 
                            onClick={handleResetThresholds}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Reset to Default
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* 1 Word Match */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">1 Word Match</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={thresholds.oneWord}
                                onChange={(e) => setThresholds({...thresholds, oneWord: parseFloat(e.target.value)})}
                                className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum similarity score for single word matches.</p>
                        </div>

                        {/* 2 Words Match */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">2 Words Match</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={thresholds.twoWords}
                                onChange={(e) => setThresholds({...thresholds, twoWords: parseFloat(e.target.value)})}
                                className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum similarity score for two-word phrase matches.</p>
                        </div>

                        {/* 3+ Words Match */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">3+ Words Match</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={thresholds.threeOrMore}
                                onChange={(e) => setThresholds({...thresholds, threeOrMore: parseFloat(e.target.value)})}
                                className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum similarity score for longer phrase matches.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Embedding Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-6 pb-4">
                    <h3 className="text-base font-semibold text-gray-900">Recent Embedding Jobs</h3>
                    <button className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                        View All Logs
                    </button>
                </div>

                <table className="w-full">
                    <thead>
                        <tr className="border-y border-gray-100">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((job) => (
                            <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-mono text-gray-600">{job.jobId}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                        job.type === 'Review' 
                                            ? 'bg-purple-100 text-purple-600' 
                                            : 'bg-orange-100 text-orange-600'
                                    }`}>
                                        {job.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-sm font-medium ${
                                        job.status === 'Completed' ? 'text-green-600' : 
                                        job.status === 'Failed' ? 'text-red-500' : 
                                        'text-blue-500'
                                    }`}>
                                        {job.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all ${
                                                    job.status === 'Completed' ? 'bg-green-500' :
                                                    job.status === 'Failed' ? 'bg-red-500' :
                                                    'bg-blue-500'
                                                }`}
                                                style={{ width: `${job.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-600">{job.progress}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{job.duration}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{job.timestamp}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
