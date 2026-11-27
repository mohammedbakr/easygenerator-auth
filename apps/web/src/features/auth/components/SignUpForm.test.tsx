import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { renderRoutes } from '@/test/render';
import { ApiError } from '@/lib/http';
import * as api from '../api';
import { SignUpForm } from './SignUpForm';

vi.mock('../api');
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const user = { id: '1', email: 'jane@example.com', name: 'Jane Doe' };

function renderForm() {
  return renderRoutes(
    [
      { path: '/signup', element: <SignUpForm /> },
      { path: '/app', element: <p>APP PAGE</p> },
    ],
    { initialEntries: ['/signup'], me: null },
  );
}

const email = () => screen.getByLabelText('Email');
const name = () => screen.getByLabelText('Name');
const password = () => screen.getByLabelText('Password');
const submit = () => screen.getByRole('button', { name: 'Create account' });

async function fillValid(u: ReturnType<typeof userEvent.setup>) {
  await u.type(email(), '  Jane@Example.com ');
  await u.type(name(), '  Jane Doe ');
  await u.type(password(), 'S3cure!pass');
}

describe('SignUpForm', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the right error per field and focuses the first invalid one', async () => {
    const u = userEvent.setup();
    renderForm();
    await u.type(email(), 'bad');
    await u.type(name(), 'Jo');
    await u.type(password(), 'abc');
    await u.click(submit());

    expect(email()).toHaveAccessibleDescription('Enter a valid email address');
    expect(name()).toHaveAccessibleDescription('Name must be at least 3 characters');
    expect(password()).toHaveAccessibleDescription(/Password must be at least 8 characters/);
    expect(email()).toBeInvalid();
    expect(email()).toHaveFocus();
    expect(api.signUp).not.toHaveBeenCalled();
  });

  it('ticks the password checklist as rules are met', async () => {
    const u = userEvent.setup();
    renderForm();
    const items = () =>
      within(screen.getByRole('list', { name: 'Password requirements' })).getAllByRole('listitem');
    expect(items().map((li) => li.dataset.met)).toEqual(['false', 'false', 'false', 'false']);

    await u.type(password(), 'abcdefgh');
    expect(items().map((li) => li.dataset.met)).toEqual(['true', 'true', 'false', 'false']);

    await u.type(password(), '1!');
    expect(items().map((li) => li.dataset.met)).toEqual(['true', 'true', 'true', 'true']);
  });

  it('toggles password visibility', async () => {
    const u = userEvent.setup();
    renderForm();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(password()).toHaveAttribute('type', 'password');
    await u.click(toggle);
    expect(password()).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('submits trimmed and lowercased values, then goes to /app', async () => {
    vi.mocked(api.signUp).mockResolvedValue(user);
    const u = userEvent.setup();
    renderForm();
    await fillValid(u);
    await u.click(submit());

    expect(await screen.findByText('APP PAGE')).toBeInTheDocument();
    expect(vi.mocked(api.signUp).mock.calls[0][0]).toEqual({
      email: 'jane@example.com',
      name: 'Jane Doe',
      password: 'S3cure!pass',
    });
  });

  it('shows a 409 field error under the email input and focuses it', async () => {
    vi.mocked(api.signUp).mockRejectedValue(
      new ApiError(409, 'Email is already registered', [
        { field: 'email', message: 'Email is already registered' },
      ]),
    );
    const u = userEvent.setup();
    renderForm();
    await fillValid(u);
    await u.click(submit());

    await vi.waitFor(() =>
      expect(email()).toHaveAccessibleDescription('Email is already registered'),
    );
    expect(email()).toBeInvalid();
    expect(email()).toHaveFocus();
  });

  it('shows a generic toast for a server error, never the server text', async () => {
    vi.mocked(api.signUp).mockRejectedValue(new ApiError(500, 'db exploded'));
    const u = userEvent.setup();
    renderForm();
    await fillValid(u);
    await u.click(submit());

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.'),
    );
    expect(screen.queryByText('db exploded')).not.toBeInTheDocument();
  });

  it('disables the button while the request is pending (no double submit)', async () => {
    vi.mocked(api.signUp).mockReturnValue(new Promise(() => undefined));
    const u = userEvent.setup();
    renderForm();
    await fillValid(u);
    await u.click(submit());

    // While pending the spinner adds "Loading" to the button's accessible name.
    const pending = await screen.findByRole('button', { name: /Loading/ });
    expect(pending).toBeDisabled();
    expect(api.signUp).toHaveBeenCalledTimes(1);
  });
});
