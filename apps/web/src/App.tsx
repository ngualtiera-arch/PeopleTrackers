import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/Login';
import { MainMenu } from './pages/MainMenu';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ClientsListPage } from './features/clients/ClientsListPage';
import { ClientDetailPage } from './features/clients/ClientDetailPage';
import { AgentsListPage } from './features/agents/AgentsListPage';
import { AgentDetailPage } from './features/agents/AgentDetailPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainMenu />} />
              <Route path="/files" element={<PlaceholderPage title="Files" phase="Phase 3 — Cases" />} />
              <Route path="/clients" element={<ClientsListPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/agents" element={<AgentsListPage />} />
              <Route path="/agents/:id" element={<AgentDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute requireRole="admin" />}>
              <Route path="/settings" element={<PlaceholderPage title="Settings" phase="Phase 6 — Settings & hardening" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
