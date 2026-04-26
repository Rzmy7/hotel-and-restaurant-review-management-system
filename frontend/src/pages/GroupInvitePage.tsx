import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  Crown,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { groupsService, type JoinLinkInfo } from "../services/groupsService";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

const GroupInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [info, setInfo] = useState<JoinLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link.");
      setLoading(false);
      return;
    }
    if (!user) {
      navigate(`/login?redirect=/groups/join/${token}`);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await groupsService.getJoinInfo(token);
        setInfo(data);
      } catch (err: any) {
        setError(err.message || "This invite link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token, user, navigate]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const res = await groupsService.joinViaLink(token);
      showToast(res.message, "success");
      navigate(`/groups/${res.group_id}`);
    } catch (err: any) {
      showToast(err.message || "Failed to join group", "error");
      setJoining(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/groups")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Groups
        </button>

        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-10 text-center">
            <Loader2
              size={32}
              className="animate-spin text-brand mx-auto mb-3"
            />
            <p className="text-sm text-gray-400 dark:text-slate-500">
              Loading invite details…
            </p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/40 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Invalid Invite Link
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate("/groups")}
              className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
            >
              Go to Groups
            </button>
          </div>
        ) : info ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Banner */}
            <div className="bg-gradient-to-r from-brand to-blue-500 p-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Crown size={32} className="text-white" />
              </div>
              <h1 className="text-xl font-black text-white">
                Group Invitation
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                You've been invited to join a group
              </p>
            </div>

            {/* Group info */}
            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                  {info.group_name}
                </h2>
                {info.description && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {info.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500 dark:text-slate-400">
                <Users size={15} />
                <span>
                  {info.member_count}{" "}
                  {info.member_count === 1 ? "member" : "members"}
                </span>
              </div>

              {info.already_member ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 justify-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <Check size={16} className="text-green-500" />
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      You're already a member of this group
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/groups/${info.group_id}`)}
                    className="w-full px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
                  >
                    View Group Dashboard
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full px-4 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {joining ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {joining ? "Joining…" : "Join Group"}
                  </button>
                  <button
                    onClick={() => navigate("/groups")}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GroupInvitePage;
