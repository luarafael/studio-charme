import { Navigate, Outlet, useLocation } from 'react-router';
import { RouteFallback } from '@/components/feedback/RouteFallback';
import { useAuth } from './AuthProvider';

/** Protege /app: sem sessão, volta ao login sem revelar que a rota existe internamente. */
export function RequireAuth() {
  const { professional, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteFallback />;
  if (!professional) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { professional, isLoading } = useAuth();
  if (isLoading) return <RouteFallback />;
  if (professional) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}
