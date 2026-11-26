import { createBrowserRouter, Navigate } from 'react-router';
import { PublicOnlyRoute } from '@/features/auth/routes/PublicOnlyRoute';
import { ProtectedRoute } from '@/features/auth/routes/ProtectedRoute';
import { AppPage } from '@/pages/AppPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { RouteError } from './RouteError';

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Navigate to="/app" replace /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/signin', element: <SignInPage /> },
          { path: '/signup', element: <SignUpPage /> },
        ],
      },
      { element: <ProtectedRoute />, children: [{ path: '/app', element: <AppPage /> }] },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
