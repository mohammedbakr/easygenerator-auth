import { createBrowserRouter, Navigate } from 'react-router';
import { AppPage } from '@/pages/AppPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';

// ProtectedRoute / PublicOnlyRoute layout routes wrap these once useMe() exists.
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/signin', element: <SignInPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/app', element: <AppPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
