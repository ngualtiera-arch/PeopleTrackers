import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ApiError } from './lib/api-client';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/Login';
import { MainMenu } from './pages/MainMenu';
import { ClientsListPage } from './features/clients/ClientsListPage';
import { ClientDetailPage } from './features/clients/ClientDetailPage';
import { AgentsListPage } from './features/agents/AgentsListPage';
import { AgentDetailPage } from './features/agents/AgentDetailPage';
import { FilesListPage } from './features/cases/FilesListPage';
import { CaseDetailPage } from './features/cases/CaseDetailPage';
import { TemplateEditorPage } from './features/templates/TemplateEditorPage';
import { SettingsPage } from './features/settings/SettingsPage';

// Default retry:3 with exponential backoff makes sense for a flaky network, but retrying a
// 4xx is never going to produce a different result. Without this, deleting a record whose
// detail query is still mounted (e.g. deleting a case from its own detail page) triggers an
// invalidateQueries refetch that immediately 404s and retries 3 times (~1s+2s+4s) before
// settling — and a delete's onSuccess handler implicitly awaits that invalidation, so the UI
// sat frozen for several seconds after every delete, which read as a hang during testing.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 3;
      },
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainMenu />} />
              <Route path="/files" element={<FilesListPage />} />
              <Route path="/files/:id" element={<CaseDetailPage />} />
              <Route path="/clients" element={<ClientsListPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/agents" element={<AgentsListPage />} />
              <Route path="/agents/:id" element={<AgentDetailPage />} />
              <Route path="/templates" element={<TemplateEditorPage />} />
            </Route>

            <Route element={<ProtectedRoute requireRole="admin" />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
