import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoutes } from '@/test/render';
import { ApiError } from '@/lib/http';
import * as api from '../api';
import { SignInForm } from './SignInForm';

vi.mock('../api');

function renderForm() {
  return renderRoutes(
    [
      { path: '/signin', element: <SignInForm /> },
      { path: '/app', element: <p>APP PAGE</p> },
    ],
    { initialEntries: ['/signin'], me: null },
  );
}

async function fillAndSubmit(u: ReturnType<typeof userEvent.setup>) {
  await u.type(screen.getByLabelText('Email'), 'jane@example.com');
  await u.type(screen.getByLabelText('Password'), 'wrong-password');
  await u.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignInForm', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the form-level message from the API on a 401', async () => {
    vi.mocked(api.signIn).mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    renderForm();
    await fillAndSubmit(userEvent.setup());

    const alert = await screen.findByText('Invalid email or password');
    expect(alert).toHaveAttribute('role', 'alert');
  });

  it('shows the API message on a 429', async () => {
    vi.mocked(api.signIn).mockRejectedValue(
      new ApiError(429, 'Too many requests, please try again in a minute'),
    );
    renderForm();
    await fillAndSubmit(userEvent.setup());

    expect(
      await screen.findByText('Too many requests, please try again in a minute'),
    ).toHaveAttribute('role', 'alert');
  });

  it('requires both fields before calling the API', async () => {
    const u = userEvent.setup();
    renderForm();
    await u.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Email is required');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Password is required');
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it('goes to /app on success', async () => {
    vi.mocked(api.signIn).mockResolvedValue({
      id: '1',
      email: 'jane@example.com',
      name: 'Jane Doe',
    });
    renderForm();
    await fillAndSubmit(userEvent.setup());

    expect(await screen.findByText('APP PAGE')).toBeInTheDocument();
  });
});
