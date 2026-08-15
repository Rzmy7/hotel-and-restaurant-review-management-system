import React, { useState, useEffect, Suspense } from 'react';
import { maintenanceService } from './services/maintenanceService';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

// Providers and Contexts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './contexts/ToastContext';

const queryClient = new QueryClient();

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationBlockerProvider } from './contexts/NavigationBlockerContext';
import { isAdminRole, getDashboardPathForRole, isExternalDestination } from './utils/authRole';

// Components
import Sidebar from './components/shared/SideBar';
import ScrapeLauncher from './components/shared/ScrapeLauncher';
import DashboardSkeleton from './pages/DashboardSkeleton';
import InsightsSkeleton from './pages/InsightsSkeleton';
import ReviewsSkeleton from './pages/ReviewsSkeleton';
import ReviewSourcesSkeleton from './pages/ReviewSourcesSkeleton';
import SetupSkeleton from './pages/SetupSkeleton';
import SettingsSkeleton from './pages/SettingsSkeleton';
import CompetitorsSkeleton from './pages/CompetitorsSkeleton';
import GroupsSkeleton from './pages/GroupsSkeleton';

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
const TermsOfServicePage = React.lazy(() => import('./pages/TermsOfServicePage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));

// Pages - Main Application (Lazy Loaded)
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ReviewsPage = React.lazy(() => import('./pages/ReviewsPage'));
const ReviewDetailPage = React.lazy(() => import('./pages/ReviewDetailPage'));
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
const LandingPage = React.lazy(() => import('./pages/LandingPage'));

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

  // ponytail: if admin tries to access user frontend, redirect them to admin-frontend
  if (isAdminRole(user.role)) {
    const destination = getDashboardPathForRole(user.role);
    if (isExternalDestination(destination)) {
      window.location.href = destination;
      return null;
    }
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
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    let mounted = true;

    const loadMaintenanceStatus = async () => {
      try {
        // Safety timeout: assumed no maintenance if backend hangs (e.g. DB connection issues)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Maintenance check timed out')), 5000)
        );

        const result = await Promise.race([
          maintenanceService.getStatus(),
          timeoutPromise
        ]) as any;

        if (mounted) {
          setMaintenanceMode(!!result.maintenanceMode);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load maintenance status:', error);
        }
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

  // Handle scroll-friendly body class for Landing Page vs fixed-height shell for Dashboard
  useEffect(() => {
    if (isLandingPage) {
      document.body.classList.add('landing-scroll');
      document.documentElement.classList.add('landing-scroll');
    } else {
      document.body.classList.remove('landing-scroll');
      document.documentElement.classList.remove('landing-scroll');
    }
    return () => {
      document.body.classList.remove('landing-scroll');
      document.documentElement.classList.remove('landing-scroll');
    };
  }, [isLandingPage]);

  /**
   * Toggles the expanded/collapsed state of the navigation sidebar.
   */
  const handleSidebarToggle = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  // Log initialization state for debugging purposes
  if (import.meta.env.DEV && (!maintenanceLoaded || isAuthLoading)) {
    console.log(`[App] Initializing: maintenanceLoaded=${maintenanceLoaded}, isAuthLoading=${isAuthLoading}, path=${window.location.pathname}`);
  }

  // Show a blank or loading state while maintenance status or auth state is loading
  // EXCEPTION: Always allow the Landing Page to render immediately for better UX and resilience.
  if ((!maintenanceLoaded || isAuthLoading) && !isLandingPage) {
    return (
      <div className="h-screen w-full bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 mb-4"></div>
        <p className="text-gray-900 dark:text-white text-lg font-medium tracking-wide text-center">Loading application...</p>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-2">Connecting to secure services...</p>
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
        <Route path="/" element={<LandingPage />} />
        {/* 
          Authentication Routes
          Only accessible when not logged in.
        */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />
        
        {/* Legal Pages */}
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* 
          Initial Setup Workflow
          Standalone pages for the first-time user setup experience.
        */}
        <Route path="/setup" element={<RequireAuth><Suspense fallback={<SetupSkeleton currentStep={1} />}><SetupPage /></Suspense></RequireAuth>} />
        <Route path="/setup/sources" element={<RequireAuth><Suspense fallback={<SetupSkeleton currentStep={2} />}><AddSourcesPage /></Suspense></RequireAuth>} />
        <Route path="/setup/schedule" element={<RequireAuth><Suspense fallback={<SetupSkeleton currentStep={3} />}><ChooseSchedulePage /></Suspense></RequireAuth>} />
        <Route path="/setup/plan" element={<RequireAuth><Suspense fallback={<SetupSkeleton currentStep={3} />}><ChoosePlanPage /></Suspense></RequireAuth>} />
        <Route path="/setup/finish" element={<RequireAuth><Suspense fallback={<SetupSkeleton currentStep={3} />}><FinishSetupPage /></Suspense></RequireAuth>} />


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
                  <Route path="/dashboard" element={<RequireAuth><RequireOrganization><Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense></RequireOrganization></RequireAuth>} />
                  <Route path="/reviews" element={<RequireAuth><RequireOrganization><Suspense fallback={<ReviewsSkeleton />}><ReviewsPage /></Suspense></RequireOrganization></RequireAuth>} />
                  <Route path="/reviews/:id" element={<RequireAuth><RequireOrganization><Suspense fallback={<ReviewsSkeleton />}><ReviewDetailPage /></Suspense></RequireOrganization></RequireAuth>} />
                  <Route path="/sources" element={<RequireAuth><RequireOrganization><Suspense fallback={<ReviewSourcesSkeleton />}><ReviewSourcesPage /></Suspense></RequireOrganization></RequireAuth>} />
                  <Route path="/insights" element={<RequireAuth><RequireOrganization><Suspense fallback={<InsightsSkeleton />}><InsightsPage /></Suspense></RequireOrganization></RequireAuth>} />
                  <Route path="/competitors" element={<RequireAuth><RequireOrganization><Suspense fallback={<CompetitorsSkeleton />}><CompetitorsPage /></Suspense></RequireOrganization></RequireAuth>} />
                  <Route path="/competitors/rankings" element={<RequireAuth><RequireOrganization><CompetitorRankingsPage /></RequireOrganization></RequireAuth>} />
                  <Route path="/competitors/compare" element={<RequireAuth><RequireOrganization><CompetitorComparison /></RequireOrganization></RequireAuth>} />

                  {/* Group routes — org-scoped pages require an active organization */}
                  <Route path="/groups" element={<RequireAuth><RequireOrganization><Suspense fallback={<GroupsSkeleton />}><GroupsPage /></Suspense></RequireOrganization></RequireAuth>} />
                  <Route path="/groups/:groupId" element={<RequireAuth><RequireOrganization><GroupDashboardPage /></RequireOrganization></RequireAuth>} />
                  <Route path="/groups/join/:token" element={<RequireAuth><GroupInvitePage /></RequireAuth>} />

                  {/* Pages that don't require an org */}
                  <Route path="/settings" element={<RequireAuth><Suspense fallback={<SettingsSkeleton />}><SettingsPage /></Suspense></RequireAuth>} />
                  <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                  <Route path="/help" element={<RequireAuth><HelpPage /></RequireAuth>} />
                  <Route path="/support" element={<RequireAuth><SupportPage /></RequireAuth>} />
                  <Route path="/subscription" element={<RequireAuth><SubscriptionPage /></RequireAuth>} />
                  <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                  <Route path="/no-organization" element={<RequireAuth><NoOrganizationPage /></RequireAuth>} />

                  {/* Fallback for undefined routes within the main shell */}
                  <Route path="*" element={<NotFound />} />

                </Routes>
              </main>
            </div>
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
        <Router>
          <ToastProvider>
            <NavigationBlockerProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </NavigationBlockerProvider>
          </ToastProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
