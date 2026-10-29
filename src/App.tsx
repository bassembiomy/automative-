import { HashRouter, Route, Routes } from 'react-router-dom';
import { DiagnosticProvider } from './state/DiagnosticContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectPage } from './pages/ConnectPage';
import { CodesPage } from './pages/CodesPage';
import { ModulesPage } from './pages/ModulesPage';
import { LiveDataPage } from './pages/LiveDataPage';
import { LookupPage } from './pages/LookupPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <DiagnosticProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="connect" element={<ConnectPage />} />
            <Route path="codes" element={<CodesPage />} />
            <Route path="modules" element={<ModulesPage />} />
            <Route path="live" element={<LiveDataPage />} />
            <Route path="lookup" element={<LookupPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </DiagnosticProvider>
  );
}
