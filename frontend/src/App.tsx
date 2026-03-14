import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import Sidebar from "./components/SideBar";
import ReviewsPage from "./pages/ReviewsPage";
import DashboardPage from "./pages/DashboardPage";
import ReviewSourcesPage from "./pages/ReviewSourcesPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SetupPage from "./pages/SetupPage";
import AddSourcesPage from "./pages/AddSourcesPage";
import ChooseSchedulePage from "./pages/ChooseSchedulePage";
import FinishSetupPage from "./pages/FinishSetupPage";
import NotificationsPage from "./pages/NotificationsPage";
import ScrapeLauncher from "./components/ScrapeLauncher";
import { AuthProvider, useAuth } from "./context/AuthContext";

import AdminDashboardPage from "./pages/AdminDashboardPage";

import "./App.css"; // styles

const NotFound = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>404</h1>
      <p>Page not Found</p>
      {/* It's good practice to provide a way back */}
      <Link to="/">Go Home</Link>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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


      {/* Main app routes with navigation sidebar (protected) */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <div className="app-container">
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage toggleSidebar={toggleSidebar} />} />
                  <Route path="/reviews" element={<ReviewsPage toggleSidebar={toggleSidebar} />} />
                  <Route path="/sources" element={<ReviewSourcesPage toggleSidebar={toggleSidebar} />} />
                  <Route path="/settings" element={<SettingsPage toggleSidebar={toggleSidebar} />} />
                  <Route path="/notifications" element={<NotificationsPage toggleSidebar={toggleSidebar} />} />
                  <Route path="/profile" element={<ProfilePage toggleSidebar={toggleSidebar} />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </RequireAuth>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
