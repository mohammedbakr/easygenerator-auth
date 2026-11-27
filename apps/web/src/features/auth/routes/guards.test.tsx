import { screen } from '@testing-library/react';
import { useLocation } from 'react-router';
import { renderRoutes } from '@/test/render';
import * as api from '../api';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

vi.mock('../api');

const user = { id: '1', email: 'jane@example.com', name: 'Jane Doe' };

function SignInProbe() {
  const state = useLocation().state as { from?: { pathname?: string } } | null;
  return <p>SIGNIN PAGE from {state?.from?.pathname}</p>;
}

const routes = [
  { path: '/', element: <p>HOME</p> },
  { element: <PublicOnlyRoute />, children: [{ path: '/signin', element: <SignInProbe /> }] },
  { element: <ProtectedRoute />, children: [{ path: '/app', element: <p>APP PAGE</p> }] },
];

describe('route guards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('ProtectedRoute redirects to /signin and remembers the requested path when signed out', async () => {
    renderRoutes(routes, { initialEntries: ['/app'], me: null });
    expect(await screen.findByText('SIGNIN PAGE from /app')).toBeInTheDocument();
  });

  it('ProtectedRoute shows the page when signed in', async () => {
    renderRoutes(routes, { initialEntries: ['/app'], me: user });
    expect(await screen.findByText('APP PAGE')).toBeInTheDocument();
  });

  it('PublicOnlyRoute redirects signed-in users to /app', async () => {
    renderRoutes(routes, { initialEntries: ['/signin'], me: user });
    expect(await screen.findByText('APP PAGE')).toBeInTheDocument();
  });

  it('PublicOnlyRoute shows the page when signed out', async () => {
    renderRoutes(routes, { initialEntries: ['/signin'], me: null });
    expect(await screen.findByText(/SIGNIN PAGE/)).toBeInTheDocument();
  });

  it('shows a spinner while the session is loading', () => {
    vi.mocked(api.getMe).mockReturnValue(new Promise(() => undefined));
    renderRoutes(routes, { initialEntries: ['/app'] });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('APP PAGE')).not.toBeInTheDocument();
  });
});
