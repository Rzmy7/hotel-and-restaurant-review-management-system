import { useState } from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ReviewsProvider } from './contexts/ReviewsContext';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Sidebar from './components/shared/SideBar';
import ReviewsPage from './pages/ReviewsPage';
import DashboardPage from './pages/DashboardPage';
import ReviewSourcesPage from './pages/ReviewSourcesPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import SetupPage from './pages/SetupPage';
import AddSourcesPage from './pages/AddSourcesPage';
import ChooseSchedulePage from './pages/ChooseSchedulePage';
import FinishSetupPage from './pages/FinishSetupPage';
import ScrapeLauncher from './components/shared/ScrapeLauncher';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import InsightsPage from './pages/InsightsPage';
import CompetitorsPage from './pages/CompetitorsPage';
import CompetitorRankingsPage from './pages/CompetitorRankingsPage';
import CompetitorComparison from './pages/CompetitorComparison';

import { AuthProvider, useAuth } from "./context/AuthContext";

import AdminDashboardPage from "./pages/AdminDashboardPage";

import OAuthSuccessPage from "./pages/OAuthSuccessPage";

import "./App.css"; // styles

const NotFound = () => {
  return (
    <div className="text-center mt-12">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-500 mt-2">Page not Found</p>
      <Link to="/" className="text-blue-500 hover:text-blue-700 mt-4 inline-block">Go Home</Link>
    </div>
  );
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Wrapper component to handle location changes
const AppContent = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const handleSidebarToggle = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  return (
    <Routes>
      {/* Auth routes - standalone without sidebar */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      <Route path="/setup" element={<SetupPage />} />
      <Route path="/setup/sources" element={<AddSourcesPage />} />
      <Route path="/setup/schedule" element={<ChooseSchedulePage />} />
      <Route path="/setup/finish" element={<FinishSetupPage />} />
      <Route path="/scrape" element={<ScrapeLauncher />} />

      <Route path="/admin-dashboard" element={<AdminDashboardPage />} />

      <Route path="/oauth-success" element={<OAuthSuccessPage />} />


      {/* Main app routes with navigation sidebar (protected) */}
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
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/sources" element={<ReviewSourcesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/competitors" element={<CompetitorsPage />} />
                <Route path="/competitors/rankings" element={<CompetitorRankingsPage />} />
                <Route path="/competitors/compare" element={<CompetitorComparison />} />
                <Route
                  path="/profile"
                  element={<ProfilePage />}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        }
      />
    </Routes>
  );
};

import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationBlockerProvider } from './contexts/NavigationBlockerContext';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <NavigationBlockerProvider>
            <OrganizationProvider>
              <ReviewsProvider>
                <AuthProvider>
                  <AppContent />
                </AuthProvider>
              </ReviewsProvider>
            </OrganizationProvider>
          </NavigationBlockerProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
