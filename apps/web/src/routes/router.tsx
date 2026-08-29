import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { RouteFallback } from '@/components/feedback/RouteFallback';

// A página inicial carrega imediatamente; as demais entram por lazy loading para
// não pesar no primeiro acesso de quem só quer agendar.
const HomePage = lazy(() => import('@/pages/HomePage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

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

  { path: '*', element: withSuspense(<NotFoundPage />) },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
