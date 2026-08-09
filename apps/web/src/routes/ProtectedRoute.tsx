import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '@peopletrackers/shared';
import { useAuth } from '../lib/auth';

export function ProtectedRoute({ requireRole }: { requireRole?: UserRole }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
