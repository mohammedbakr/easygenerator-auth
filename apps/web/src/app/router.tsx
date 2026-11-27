import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from '@/features/auth/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/routes/PublicOnlyRoute';
import { RouteError } from './RouteError';

// Pages are lazy-loaded: the sign-in page never downloads the app page (or the other way round).
export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Navigate to="/app" replace /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            path: '/signin',
            lazy: async () => ({ Component: (await import('@/pages/SignInPage')).SignInPage }),
          },
          {
            path: '/signup',
            lazy: async () => ({ Component: (await import('@/pages/SignUpPage')).SignUpPage }),
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/app',
            lazy: async () => ({ Component: (await import('@/pages/AppPage')).AppPage }),
          },
        ],
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).NotFoundPage }),
      },
    ],
  },
]);
