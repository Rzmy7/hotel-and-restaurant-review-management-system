import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Organizations } from './pages/Organizations';
import { UsersPage } from './pages/Users';
import { FeatureFlags } from './pages/FeatureFlags';
import { Settings } from './pages/Settings';

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes> 
      
    </BrowserRouter>
  );
}

export default App;
