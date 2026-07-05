import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Organizations } from './pages/Organizations';
import { UsersPage } from './pages/Users';
import { FeatureFlags } from './pages/FeatureFlags';
import { Settings } from './pages/Settings';
import { Embeddings } from './pages/Embeddings';
import { Scraping } from './pages/Scraping';

import { Monitoring } from './pages/Monitoring';
import { SubscriptionPlans } from './pages/SubscriptionPlans';
import { Broadcasting } from './pages/Broadcasting';
import { ReplyGeneration } from './pages/ReplyGeneration';
import { ReviewProcessing } from './pages/ReviewProcessing';
import { LLMModels } from './pages/LLMModels';
import { getFrontendLoginUrl } from './config/frontend';
import { ThemeProvider } from './contexts/ThemeContext';

import { apiClient } from './api/client';
import { useEffect, useState } from 'react';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // ponytail: clean up any legacy, insecure JWT tokens from localStorage
      localStorage.removeItem('token');

      try {
        const me = await apiClient.get<any>('/auth/me');
        if (me && me.user_id) {
          // ponytail: restrict access strictly to admin roles
          const roles = Array.isArray(me.roles) ? me.roles : [me.role];
          const isAdmin = roles.some((r: any) => ['admin', 'system_admin', 'super_admin'].includes(String(r || '').trim().toLowerCase()));
          if (!isAdmin) {
            console.warn("Access denied: Not an administrator.");
            window.location.href = getFrontendLoginUrl();
            return;
          }
          localStorage.setItem('authUser', JSON.stringify(me));
          setReady(true);
        } else {
          window.location.href = getFrontendLoginUrl();
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // Note: apiClient automatically handles 401 redirects, but we use this fallback
        window.location.href = getFrontendLoginUrl();
      }
    };

    checkAuth();
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Authenticating...</p>
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
            <Route path="llm-models" element={<LLMModels />} />
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

