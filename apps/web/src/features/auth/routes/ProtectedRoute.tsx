import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useMe } from '../hooks';

export function ProtectedRoute() {
  const { data: user, isPending } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <Outlet />;
}
