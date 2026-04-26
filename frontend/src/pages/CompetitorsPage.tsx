import {
  ChevronDown,
  TrendingUp,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import AddCompetitorModal from "../components/competitors/AddCompetitorModal";
import EditCompetitorModal from "../components/competitors/EditCompetitorModal";
import {
  fetchCompetitors,
  untrackCompetitor,
  type Competitor,
} from "../services/competitorService";
import { useOrganizationStore } from "../stores/useOrganizationStore";

const CompetitorsPage = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [competitorToEdit, setCompetitorToEdit] = useState<Competitor | null>(
    null,
  );
  const queryClient = useQueryClient();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizationId = currentOrg?.id ?? "";

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["competitors", organizationId],
    queryFn: () => fetchCompetitors(organizationId),
    enabled: !!organizationId,
  });

  const tracked = data?.tracked ?? [];
  const errorMessage = error instanceof Error ? error.message : null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["competitors", organizationId],
    });
  };

  const handleSuccess = () => {
    invalidateAll();
  };

  const untrackMutation = useMutation({
    mutationFn: (competitorId: string) =>
      untrackCompetitor(organizationId, competitorId),
    onSuccess: invalidateAll,
  });

  const handleUntrack = async (competitorId: string) => {
    if (!confirm("Remove this competitor from your tracked list?")) return;
    untrackMutation.mutate(competitorId);
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
      <PageHeader title="Competitors" subtitle="Manage your competitor list">
        <button className="flex items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm w-32">
          Hotel
          <ChevronDown
            size={16}
            className="text-gray-400 dark:text-slate-500"
          />
        </button>
      </PageHeader>

      {/* Main Content */}
      <main className="w-full px-8 py-8 flex-1 max-w-[1600px] mx-auto">
        {/* Error State */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Competitor List Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Competitor List
            </h2>
            <div className="flex items-center gap-3">
              <Link
                to="/competitors/rankings"
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <TrendingUp size={16} />
                View Rankings
              </Link>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
              >
                <Plus size={16} />
                Add Competitor
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-blue-500" />
              <span className="ml-3 text-gray-500">Loading competitors...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && tracked.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                No competitors tracked yet
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Click "Add Competitor" to start tracking hotels from the
                available pool.
              </p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[25%]">
                    Competitor Name
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                    Location
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[15%]">
                    Avg Rating
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[15%]">
                    Sentiment Score
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[15%]">
                    Review Count
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[10%] text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                {tracked.map((competitor: Competitor) => (
                  <tr
                    key={competitor.id}
                    className="hover:bg-gray-50/30 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <span className="font-semibold text-gray-900 dark:text-white text-[15px]">
                        {competitor.name}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-gray-500 dark:text-gray-400 text-[15px]">
                        {competitor.location}
                      </span>
                    </td>
                    <td className="px-6 py-5 flex items-center gap-1">
                      <span className="font-bold text-gray-900 dark:text-white text-[15px]">
                        {competitor.avgRating}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="#fbbf24"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-gray-700 dark:text-gray-300 font-medium text-[15px]">
                        {competitor.sentimentScore}%
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-gray-500 dark:text-gray-400 text-[15px]">
                        {competitor.reviewCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          to={`/competitors/compare?id=${competitor.id}`}
                          className="bg-[#4e80ee] hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
                        >
                          Compare
                        </Link>
                        <button
                          onClick={() => setCompetitorToEdit(competitor)}
                          className="text-gray-400 hover:text-blue-500 p-1.5 transition-colors"
                          aria-label="Edit"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleUntrack(competitor.id)}
                          className="text-red-400 hover:text-red-500 p-1.5 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AddCompetitorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <EditCompetitorModal
        isOpen={!!competitorToEdit}
        onClose={() => setCompetitorToEdit(null)}
        onSuccess={handleSuccess}
        competitor={competitorToEdit}
      />
    </div>
  );
};

export default CompetitorsPage;
