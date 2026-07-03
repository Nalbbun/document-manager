import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DocumentPage from './pages/DocumentPage';
import IndexPage from './pages/IndexPage';
import LogsPage from './pages/LogsPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import UploadPage from './pages/UploadPage';
import ViewerPage from './pages/ViewerPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/folders" element={<DocumentPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/documents" element={<DocumentPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/viewer/:documentId" element={<ViewerPage />} />
        <Route path="/index" element={<IndexPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </Layout>
  );
}
