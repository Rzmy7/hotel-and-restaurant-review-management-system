import React, { useState, useEffect } from 'react';
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

// Pages - Auth & Setup
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SetupPage from './pages/SetupPage';
import AddSourcesPage from './pages/AddSourcesPage';
import ChooseSchedulePage from './pages/ChooseSchedulePage';
import ChoosePlanPage from './pages/ChoosePlanPage';
import FinishSetupPage from './pages/FinishSetupPage';
import OAuthSuccessPage from "./pages/OAuthSuccessPage";

// Pages - Main Application
import DashboardPage from './pages/DashboardPage';
import ReviewsPage from './pages/ReviewsPage';
import ReviewSourcesPage from './pages/ReviewSourcesPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import InsightsPage from './pages/InsightsPage';
import HelpPage from './pages/HelpPage';
import SupportPage from './pages/SupportPage';
import SubscriptionPage from './pages/SubscriptionPage';
import CompetitorsPage from './pages/CompetitorsPage';
import CompetitorRankingsPage from './pages/CompetitorRankingsPage';
import CompetitorComparison from './pages/CompetitorComparison';
import AdminDashboardPage from "./pages/AdminDashboardPage";
import { maintenanceService } from './services/maintenanceService';

import NoOrganizationPage from "./pages/NoOrganizationPage";
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import SubgroupsPage from './pages/SubgroupsPage';

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
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null; // Wait for auth check

  if (user) {
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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (maintenanceMode) {
    return <MaintenancePage />;
  }

  return (
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
          <div
            className="flex w-full h-full overflow-hidden"
            style={{ '--sidebar-width': isSidebarExpanded ? '260px' : '68px' } as React.CSSProperties}
          >
            <Sidebar isExpanded={isSidebarExpanded} onToggle={handleSidebarToggle} />
            <main className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-y-auto min-w-0">
              <Routes>
                {/* Default root handling */}
                <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
                
                {/* Org-dependent feature pages — all require both auth AND an active organization */}
                <Route path="/dashboard" element={<RequireAuth><RequireOrganization><DashboardPage /></RequireOrganization></RequireAuth>} />
                <Route path="/reviews" element={<RequireAuth><RequireOrganization><ReviewsPage /></RequireOrganization></RequireAuth>} />
                <Route path="/sources" element={<RequireAuth><RequireOrganization><ReviewSourcesPage /></RequireOrganization></RequireAuth>} />
                <Route path="/insights" element={<RequireAuth><RequireOrganization><InsightsPage /></RequireOrganization></RequireAuth>} />
                <Route path="/competitors" element={<RequireAuth><RequireOrganization><CompetitorsPage /></RequireOrganization></RequireAuth>} />
                <Route path="/competitors/rankings" element={<RequireAuth><RequireOrganization><CompetitorRankingsPage /></RequireOrganization></RequireAuth>} />
                <Route path="/competitors/compare" element={<RequireAuth><RequireOrganization><CompetitorComparison /></RequireOrganization></RequireAuth>} />

                {/* Pages that don't require an org */}
                <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                <Route path="/help" element={<RequireAuth><HelpPage /></RequireAuth>} />
                <Route path="/support" element={<RequireAuth><SupportPage /></RequireAuth>} />
                <Route path="/subscription" element={<RequireAuth><SubscriptionPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/no-organization" element={<RequireAuth><NoOrganizationPage /></RequireAuth>} />

                {/* Groups & Subgroups */}
                <Route path="/groups" element={<RequireAuth><GroupsPage /></RequireAuth>} />
                <Route path="/groups/:groupId" element={<RequireAuth><GroupDetailPage /></RequireAuth>} />
                <Route path="/subgroups" element={<RequireAuth><SubgroupsPage /></RequireAuth>} />

                {/* Fallback for undefined routes within the main shell */}
                <Route path="*" element={<NotFound />} />

              </Routes>
            </main>
          </div>
        }
      />
    </Routes>
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
