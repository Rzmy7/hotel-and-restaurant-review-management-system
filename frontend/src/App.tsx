import { useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";

import Sidebar from "./components/SideBar";

import ReviewsPage from "./pages/ReviewsPage";
import DashboardPage from "./pages/DashboardPage";
import ReviewSourcesPage from "./pages/ReviewSourcesPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import SetupPage from "./pages/SetupPage";
import AddSourcesPage from "./pages/AddSourcesPage";
import ChooseSchedulePage from "./pages/ChooseSchedulePage";
import FinishSetupPage from "./pages/FinishSetupPage";
import ScrapeLauncher from "./components/ScrapeLauncher";
import Insights from "./pages/Insights";

import "./App.css";

/* 404 */
const NotFound = () => (
  <div style={{ textAlign: "center", marginTop: "50px" }}>
    <h1>404</h1>
    <p>Page not Found</p>
    <Link to="/dashboard">Go Dashboard</Link>
  </div>
);

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Routes>

      {/* AUTH */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/setup/sources" element={<AddSourcesPage />} />
      <Route path="/setup/schedule" element={<ChooseSchedulePage />} />
      <Route path="/setup/finish" element={<FinishSetupPage />} />
      <Route path="/scrape" element={<ScrapeLauncher />} />

      {/* MAIN */}
      <Route
        path="/*"
        element={
          <div className="app-container">

            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />

            <main className="main-content">
              <Routes>

                <Route path="" element={<Navigate to="dashboard" replace />} />

                <Route
                  path="dashboard"
                  element={<DashboardPage toggleSidebar={toggleSidebar} />}
                />

                <Route
                  path="reviews"
                  element={<ReviewsPage toggleSidebar={toggleSidebar} />}
                />

                <Route
                  path="sources"
                  element={<ReviewSourcesPage toggleSidebar={toggleSidebar} />}
                />

                <Route
                  path="settings"
                  element={<SettingsPage toggleSidebar={toggleSidebar} />}
                />

                <Route
                  path="profile"
                  element={<ProfilePage toggleSidebar={toggleSidebar} />}
                />

                {/* FIXED */}
                <Route
                  path="insights"
                  element={<Insights toggleSidebar={toggleSidebar} />}
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

export default App;
