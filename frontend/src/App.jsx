import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { History } from './pages/History.jsx';
import { NewReport } from './pages/NewReport.jsx';
import { NotFound } from './pages/NotFound.jsx';
import { ReportDetail } from './pages/ReportDetail.jsx';
import { Settings } from './pages/Settings.jsx';

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="reports" element={<History />} />
          <Route path="reports/new" element={<NewReport />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
