import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { authKeys } from '@/features/auth/hooks';
import { setOnSessionExpired } from '@/lib/http';
import { queryClient } from './query-client';
import { router } from './router';

// A failed silent refresh means the session is over: mark the user signed out so ProtectedRoute redirects.
setOnSessionExpired(() => queryClient.setQueryData(authKeys.me, null));

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
