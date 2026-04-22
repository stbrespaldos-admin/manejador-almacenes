import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WarehouseDashboard } from './pages/WarehouseDashboard';
import { ScanPage } from './pages/ScanPage';
import { ScanOutPage } from './pages/ScanOutPage';
import { HistoryPage } from './pages/HistoryPage';
import { MovementsPage } from './pages/MovementsPage';
import { WarehouseSettingsPage } from './pages/WarehouseSettingsPage';
import { LoginForm } from './components/LoginForm';
import { supabase } from './lib/supabase';
import { useEffect, useState } from 'react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!session) {
    return <LoginForm onLogin={() => {}} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/warehouse/1" replace />} />
          <Route path="warehouse/1" element={<WarehouseDashboard warehouseId="1" />} />
          <Route path="warehouse/2" element={<WarehouseDashboard warehouseId="2" />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="scan-out" element={<ScanOutPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="audit" element={<MovementsPage />} />
          <Route path="settings" element={<WarehouseSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
