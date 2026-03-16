import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Organizations } from './pages/Organizations';
import { UsersPage } from './pages/Users';
import { FeatureFlags } from './pages/FeatureFlags';
import { Settings } from './pages/Settings';
import { Embeddings } from './pages/Embeddings';
import { Scraping } from './pages/Scraping';
import { APIManage } from './pages/APIManage';
import { Monitoring } from './pages/Monitoring';
import { SubscriptionPlans } from './pages/SubscriptionPlans';

function App() {
  return (
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
          <Route path="api-manage" element={<APIManage />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="subscription-plans" element={<SubscriptionPlans />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes> 
      
    </BrowserRouter>
  );
}

export default App;
