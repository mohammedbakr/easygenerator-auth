import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { authKeys } from '@/features/auth/hooks';
import type { AuthUser } from '@/features/auth/api';

interface Options {
  initialEntries?: string[];
  /** Seeds the session: a user, or `null` for signed out. Omit to leave `useMe` to fetch. */
  me?: AuthUser | null;
}

/** Renders routes with a fresh QueryClient and an in-memory router. */
export function renderRoutes(routes: RouteObject[], { initialEntries = ['/'], me }: Options = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (me !== undefined) queryClient.setQueryData(authKeys.me, me);
  const router = createMemoryRouter(routes, { initialEntries });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}
