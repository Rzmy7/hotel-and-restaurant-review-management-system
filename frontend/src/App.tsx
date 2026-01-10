import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/SideBar';
import ReviewsPage from './pages/ReviewsPage';
import DashboardPage from './pages/DashboardPage';
import ReviewSourcesPage from './pages/ReviewSourcesPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import SetupPage from './pages/SetupPage';
import AddSourcesPage from './pages/AddSourcesPage';
import ChooseSchedulePage from './pages/ChooseSchedulePage';
import FinishSetupPage from './pages/FinishSetupPage';
import './App.css';

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
      
      {/* Profile route - standalone without navigation sidebar */}
      <Route path="/profile" element={<ProfilePage />} />
      
      {/* Main app routes with navigation sidebar */}
      <Route
        path="/*"
        element={
          <div className="app-container">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage toggleSidebar={toggleSidebar} />} />
                <Route path="/reviews" element={<ReviewsPage toggleSidebar={toggleSidebar} />} />
                <Route path="/sources" element={<ReviewSourcesPage toggleSidebar={toggleSidebar} />} />
                <Route path="/settings" element={<SettingsPage />} />
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
      <AppContent />
    </BrowserRouter>
  );
}

export default App;