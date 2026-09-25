import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingPage } from '@/components/ui';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingPage />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingPage />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  // Only redirect if loading is done (profile loaded or failed).
  // This prevents redirecting before LoginPage can navigate to the correct route.
  if (loading) return <LoadingPage />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
