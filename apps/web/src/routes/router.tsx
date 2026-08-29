import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { RouteFallback } from '@/components/feedback/RouteFallback';
import { RedirectIfAuthenticated, RequireAuth } from '@/features/auth/guards';
import { AppLayout } from '@/layouts/AppLayout';

// A página inicial carrega imediatamente; as demais entram por lazy loading para
// não pesar no primeiro acesso de quem só quer agendar.
const HomePage = lazy(() => import('@/pages/HomePage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AgendaPage = lazy(() => import('@/pages/AgendaPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const FinancePage = lazy(() => import('@/pages/FinancePage'));

function withSuspense(element: ReactNode): ReactNode {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const routes: RouteObject[] = [
  { path: '/', element: withSuspense(<HomePage />) },
  { path: '/politica-de-privacidade', element: withSuspense(<PrivacyPolicyPage />) },
  { path: '/termos-de-uso', element: withSuspense(<TermsPage />) },

  // URLs do site estático anterior. Mantidas para não quebrar links já
  // compartilhados; o redirecionamento no servidor está em `vercel.json`, e
  // estas rotas cobrem o caso de a navegação acontecer dentro da aplicação.
  {
    path: '/politica_privacidade_final.html',
    element: <Navigate to="/politica-de-privacidade" replace />,
  },
  { path: '/termos_uso_final.html', element: <Navigate to="/termos-de-uso" replace /> },

  {
    element: <RedirectIfAuthenticated />,
    children: [{ path: '/entrar', element: withSuspense(<LoginPage />) }],
  },
  { path: '/esqueci-a-senha', element: withSuspense(<ForgotPasswordPage />) },
  { path: '/definir-senha', element: withSuspense(<ResetPasswordPage />) },

  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/app/dashboard" replace /> },
          { path: 'dashboard', element: withSuspense(<DashboardPage />) },
          { path: 'agenda', element: withSuspense(<AgendaPage />) },
          { path: 'clientes', element: withSuspense(<ClientsPage />) },
          { path: 'financeiro', element: withSuspense(<FinancePage />) },
        ],
      },
    ],
  },

  { path: '*', element: withSuspense(<NotFoundPage />) },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
