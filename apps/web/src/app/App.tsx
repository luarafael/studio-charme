import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { createQueryClient } from './queryClient';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createAppRouter } from '@/routes/router';

export function App() {
  // Criados uma única vez por montagem, para que o StrictMode não descarte o cache.
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
