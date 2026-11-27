import { Navigate, Outlet } from 'react-router';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useMe } from '../hooks';

export function PublicOnlyRoute() {
  const { data: user, isPending } = useMe();

  if (isPending) return <FullPageSpinner />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
