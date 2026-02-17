import { useState, useEffect } from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Sidebar from './components/SideBar';
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
import ScrapeLauncher from './components/ScrapeLauncher';
import ProfilePage from './pages/ProfilePage';



const NotFound = () => {
  return (
    <div className="text-center mt-12">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-500 mt-2">Page not Found</p>
      <Link to="/" className="text-blue-500 hover:text-blue-700 mt-4 inline-block">Go Home</Link>
    </div>
  );
};

// Wrapper component to handle location changes
const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <Routes>
      {/* Auth routes - standalone without sidebar */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/setup/sources" element={<AddSourcesPage />} />
      <Route path="/setup/schedule" element={<ChooseSchedulePage />} />
      <Route path="/setup/finish" element={<FinishSetupPage />} />
      <Route path="/scrape" element={<ScrapeLauncher />} />

      {/* Main app routes with sidebar */}
      <Route
        path="/*"
        element={
          <div className="flex w-full h-full overflow-hidden">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 flex flex-col bg-gray-50 overflow-y-auto w-full">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage toggleSidebar={toggleSidebar} />} />
                <Route path="/reviews" element={<ReviewsPage toggleSidebar={toggleSidebar} />} />
                <Route path="/sources" element={<ReviewSourcesPage toggleSidebar={toggleSidebar} />} />
                <Route path="/settings" element={<SettingsPage toggleSidebar={toggleSidebar} />} />
                <Route
                  path="/profile"
                  element={<ProfilePage toggleSidebar={toggleSidebar} />}
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

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;