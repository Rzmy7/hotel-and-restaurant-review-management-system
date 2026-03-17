import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';

// Providers and Contexts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './contexts/ToastContext';

const queryClient = new QueryClient();

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationBlockerProvider } from './contexts/NavigationBlockerContext';

// Components
import Sidebar from './components/shared/SideBar';
import ScrapeLauncher from './components/shared/ScrapeLauncher';

// Stores
import { useOrganizationStore } from './stores/useOrganizationStore';

// Pages - Auth & Setup
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SetupPage from './pages/SetupPage';
import AddSourcesPage from './pages/AddSourcesPage';
import ChooseSchedulePage from './pages/ChooseSchedulePage';
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

/**
 * Higher-order component to protect routes that require authentication.
 * Redirects to the login page if the user is not authenticated.
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/**
 * Main application content component.
 * Manages the sidebar state and defines the routing table.
 */
const AppContent: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const fetchOrganizations = useOrganizationStore(state => state.fetchOrganizations);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  /**
   * Toggles the expanded/collapsed state of the navigation sidebar.
   */
  const handleSidebarToggle = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  return (
    <Routes>
      {/* 
        Authentication Routes
        These routes are standalone and do not display the application sidebar.
      */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/oauth-success" element={<OAuthSuccessPage />} />

      {/* 
        Initial Setup Workflow
        Standalone pages for the first-time user setup experience.
      */}
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/setup/sources" element={<AddSourcesPage />} />
      <Route path="/setup/schedule" element={<ChooseSchedulePage />} />
      <Route path="/setup/finish" element={<FinishSetupPage />} />
      
      {/* Utility/Admin Routes */}
      <Route path="/scrape" element={<ScrapeLauncher />} />
      <Route path="/admin-dashboard" element={<AdminDashboardPage />} />

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
                {/* Default redirect to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Application Feature Pages */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/sources" element={<ReviewSourcesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                
                {/* Competitor Analysis Suite */}
                <Route path="/competitors" element={<CompetitorsPage />} />
                <Route path="/competitors/rankings" element={<CompetitorRankingsPage />} />
                <Route path="/competitors/compare" element={<CompetitorComparison />} />
                
                {/* Help & Support */}
                <Route path="/help" element={<HelpPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/subscription" element={<SubscriptionPage />} />
                
                {/* User Profile */}
                <Route path="/profile" element={<ProfilePage />} />
                
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
