import { Navigate, Outlet } from 'react-router';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useMe } from '../hooks';

/** Sign-in / sign-up: signed-in users have no business here. */
export function PublicOnlyRoute() {
  const { data: user, isPending } = useMe();

  if (isPending) return <FullPageSpinner />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
