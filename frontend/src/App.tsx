import React, { useState, useEffect, Suspense } from 'react';
import { maintenanceService } from './services/maintenanceService';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';

// Providers and Contexts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './contexts/ToastContext';

const queryClient = new QueryClient();

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationBlockerProvider } from './contexts/NavigationBlockerContext';

// Components
import Sidebar from './components/shared/SideBar';
import ScrapeLauncher from './components/shared/ScrapeLauncher';

// Stores
import { useOrganizationStore } from './stores/useOrganizationStore';

/**
 * Higher-order component for routes that need an active organization.
 * Redirects to /no-organization if the store has loaded but has no org.
 */
const RequireOrganization: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasOrganization = useOrganizationStore(state => state.hasOrganization);
  const loading = useOrganizationStore(state => state.loading);

  if (loading) return null; // wait for store hydration

  if (!hasOrganization) {
    return <Navigate to="/no-organization" replace />;
  }

  return <>{children}</>;
};

// Pages - Auth & Setup (Lazy Loaded)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const SetupPage = React.lazy(() => import('./pages/SetupPage'));
const AddSourcesPage = React.lazy(() => import('./pages/AddSourcesPage'));
const ChooseSchedulePage = React.lazy(() => import('./pages/ChooseSchedulePage'));
const ChoosePlanPage = React.lazy(() => import('./pages/ChoosePlanPage'));
const FinishSetupPage = React.lazy(() => import('./pages/FinishSetupPage'));
const OAuthSuccessPage = React.lazy(() => import("./pages/OAuthSuccessPage"));

// Pages - Main Application (Lazy Loaded)
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ReviewsPage = React.lazy(() => import('./pages/ReviewsPage'));
const ReviewSourcesPage = React.lazy(() => import('./pages/ReviewSourcesPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const InsightsPage = React.lazy(() => import('./pages/InsightsPage'));
const HelpPage = React.lazy(() => import('./pages/HelpPage'));
const SupportPage = React.lazy(() => import('./pages/SupportPage'));
const SubscriptionPage = React.lazy(() => import('./pages/SubscriptionPage'));
const CompetitorsPage = React.lazy(() => import('./pages/CompetitorsPage'));
const CompetitorRankingsPage = React.lazy(() => import('./pages/CompetitorRankingsPage'));
const CompetitorComparison = React.lazy(() => import('./pages/CompetitorComparison'));
const AdminDashboardPage = React.lazy(() => import("./pages/AdminDashboardPage"));
const GroupsPage = React.lazy(() => import('./pages/GroupsPage'));
const GroupDashboardPage = React.lazy(() => import('./pages/GroupDashboardPage'));
const GroupInvitePage = React.lazy(() => import('./pages/GroupInvitePage'));
const NoOrganizationPage = React.lazy(() => import("./pages/NoOrganizationPage"));

// Styles
import "./App.css";

/**
 * NotFound component rendered when a route does not match any defined paths.
 */
const NotFound: React.FC = () => {
  return (
    <div className="text-center mt-12">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-500 mt-2">Page not Found</p>
      <Link to="/" className="text-blue-500 hover:text-blue-700 mt-4 inline-block">Go Home</Link>
    </div>
  );
};

const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-6">
      <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Under Maintenance</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
          The platform is temporarily unavailable while maintenance is in progress.
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
          Please check back shortly.
        </p>
      </div>
    </div>
  );
};

/**
 * Higher-order component to protect routes that require authentication.
 * Redirects to the login page if the user is not authenticated.
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null; // Wait for auth check

  if (user === null) {
    // If user is explicitly null, it means we checked and no session exists
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Higher-order component for public-only routes (Login, Signup).
 * Redirects to the dashboard if the user is already authenticated.
 */
const PublicRoute: React.FC<{ children: React.ReactNode; allowWhenAuthenticated?: boolean }> = ({
  children,
  allowWhenAuthenticated = false,
}) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null; // Wait for auth check

  if (user && !allowWhenAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Main application content component.
 * Manages the sidebar state and defines the routing table.
 */
const AppContent: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();
  const fetchOrganizations = useOrganizationStore(state => state.fetchOrganizations);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    let mounted = true;

    const loadMaintenanceStatus = async () => {
      try {
        const result = await maintenanceService.getStatus();
        if (mounted) {
          setMaintenanceMode(!!result.maintenanceMode);
        }
      } catch (error) {
        console.error('Failed to load maintenance status:', error);
        if (mounted) {
          setMaintenanceMode(false);
        }
      } finally {
        if (mounted) {
          setMaintenanceLoaded(true);
        }
      }
    };

    loadMaintenanceStatus();
    const intervalId = window.setInterval(loadMaintenanceStatus, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  /**
   * Toggles the expanded/collapsed state of the navigation sidebar.
   */
  const handleSidebarToggle = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  // Show a blank or loading state while maintenance status or auth state is loading
  if (!maintenanceLoaded || isAuthLoading) {
    return (
      <div className="h-screen w-full bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 mb-4"></div>
        <p className="text-gray-900 dark:text-white text-lg font-medium tracking-wide text-center">Loading application...</p>
      </div>
    );
  }

  if (maintenanceMode) {
    return <MaintenancePage />;
  }

  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 mb-4"></div>
      </div>
    }>
      <Routes>
        {/* 
          Authentication Routes
          Only accessible when not logged in.
        */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />

        {/* 
          Initial Setup Workflow
          Standalone pages for the first-time user setup experience.
        */}
        <Route path="/setup" element={<RequireAuth><SetupPage /></RequireAuth>} />
        <Route path="/setup/sources" element={<RequireAuth><AddSourcesPage /></RequireAuth>} />
        <Route path="/setup/schedule" element={<RequireAuth><ChooseSchedulePage /></RequireAuth>} />
        <Route path="/setup/plan" element={<RequireAuth><ChoosePlanPage /></RequireAuth>} />
        <Route path="/setup/finish" element={<RequireAuth><FinishSetupPage /></RequireAuth>} />


        {/* Utility/Admin Routes */}
        <Route path="/scrape" element={<RequireAuth><ScrapeLauncher /></RequireAuth>} />
        <Route path="/admin-dashboard" element={<RequireAuth><AdminDashboardPage /></RequireAuth>} />

        {/* 
          Main Application Shell
          All routes here share the sidebar navigation layout.
        */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <div
                className="flex w-full h-full overflow-hidden"
                style={{ '--sidebar-width': isSidebarExpanded ? '260px' : '68px' } as React.CSSProperties}
              >
                <Sidebar isExpanded={isSidebarExpanded} onToggle={handleSidebarToggle} />
                <main className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-y-auto min-w-0">
                  <Routes>
                    {/* Default root handling */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    
                    {/* Org-dependent feature pages — all require both auth AND an active organization */}
                    <Route path="/dashboard" element={<RequireOrganization><DashboardPage /></RequireOrganization>} />
                    <Route path="/reviews" element={<RequireOrganization><ReviewsPage /></RequireOrganization>} />
                    <Route path="/sources" element={<RequireOrganization><ReviewSourcesPage /></RequireOrganization>} />
                    <Route path="/insights" element={<RequireOrganization><InsightsPage /></RequireOrganization>} />
                    <Route path="/competitors" element={<RequireOrganization><CompetitorsPage /></RequireOrganization>} />
                    <Route path="/competitors/rankings" element={<RequireOrganization><CompetitorRankingsPage /></RequireOrganization>} />
                    <Route path="/competitors/compare" element={<RequireOrganization><CompetitorComparison /></RequireOrganization>} />

                    {/* Group routes — no org requirement */}
                    <Route path="/groups" element={<GroupsPage />} />
                    <Route path="/groups/:groupId" element={<GroupDashboardPage />} />
                    <Route path="/groups/join/:token" element={<GroupInvitePage />} />

                    {/* Pages that don't require an org */}
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/help" element={<HelpPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/no-organization" element={<NoOrganizationPage />} />

                    {/* Fallback for undefined routes within the main shell */}
                    <Route path="*" element={<NotFound />} />

                  </Routes>
                </main>
              </div>
            </RequireAuth>
          }
        />
      </Routes>
    </Suspense>
  );
};

/**
 * Root Application Component.
 * Wraps the application with all necessary providers and the router.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <NavigationBlockerProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </NavigationBlockerProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
