import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const API = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8001';

/** Fetch wrapper that automatically attaches the JWT token from localStorage */
const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
};

const AcceptInvitePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      setError("No invitation token found in the URL.");
      setLoading(false);
      return;
    }

    const acceptInvite = async () => {
      try {
        const res = await authFetch(`${API}/groups/invites/accept`, {
          method: 'POST',
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || data.message || "Failed to accept invitation");
        }

        setSuccess(true);
        setGroupId(data.group_id);
      } catch (err: any) {
        setError(err.message || "Something went wrong accepting the invite.");
      } finally {
        setLoading(false);
      }
    };

    acceptInvite();
  }, [location]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        
        {loading && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <h2 className="mt-6 text-center text-xl font-bold text-gray-900">
              Processing Invitation
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please wait while we add you to the group...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
              Invalid or Expired Link
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {error}
            </p>
            <div className="mt-8">
              <Link
                to="/groups"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to My Groups
              </Link>
            </div>
          </div>
        )}

        {!loading && success && (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
              Invitation Accepted!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You have been successfully added to the group.
            </p>
            <div className="mt-8 w-full flex flex-col gap-3">
              {groupId && (
                <Link
                  to={`/groups/${groupId}`}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  View Group Details
                </Link>
              )}
              <Link
                to="/groups"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Go to All My Groups
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AcceptInvitePage;
