import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { Organizations } from "./pages/Organizations";
import { UsersPage } from "./pages/Users";
import { FeatureFlags } from "./pages/FeatureFlags";
import { Settings } from "./pages/Settings";
import { Embeddings } from "./pages/Embeddings";
import { Scraping } from "./pages/Scraping";

import { Monitoring } from "./pages/Monitoring";
import { SubscriptionPlans } from "./pages/SubscriptionPlans";
import { Broadcasting } from "./pages/Broadcasting";
import { ReplyGeneration } from "./pages/ReplyGeneration";
import { ReviewProcessing } from "./pages/ReviewProcessing";
import { getFrontendLoginUrl } from "./config/frontend";
import { ThemeProvider } from "./contexts/ThemeContext";

import { useEffect, useState } from "react";

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // --- Token handoff: read token from URL (sent by user-frontend) ---
    const params = new URLSearchParams(window.location.search);
    let token = params.get("token");
    let urlUser = params.get("user");

    if (token) {
      localStorage.setItem("token", token);
      if (urlUser) {
        localStorage.setItem("authUser", urlUser);
      }

      // Clean the token and user from the URL without a reload
      params.delete("token");
      params.delete("user");
      const cleanUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    } else {
      token = localStorage.getItem("token");
    }

    // --- Auth guard: redirect to user-frontend login if no token ---
    if (!token) {
      window.location.href = getFrontendLoginUrl();
      return;
    }

    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#f9fafb",
        }}
      >
        <p style={{ color: "#6b7280", fontSize: "14px" }}>Authenticating...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="feature-flags" element={<FeatureFlags />} />
            <Route path="settings" element={<Settings />} />
            <Route path="embeddings" element={<Embeddings />} />
            <Route path="scraping" element={<Scraping />} />

            <Route path="monitoring" element={<Monitoring />} />
            <Route path="subscription-plans" element={<SubscriptionPlans />} />
            <Route path="broadcasting" element={<Broadcasting />} />
            <Route path="reply-generation" element={<ReplyGeneration />} />
            <Route path="review-processing" element={<ReviewProcessing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
