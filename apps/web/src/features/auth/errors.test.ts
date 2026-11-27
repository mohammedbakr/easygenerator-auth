import { toast } from 'sonner';
import { ApiError } from '@/lib/http';
import { applyApiError, getRedirectTarget } from './errors';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const fields = ['email', 'name'] as const;

function setup() {
  const setFieldError = vi.fn();
  const setFormError = vi.fn();
  return { setFieldError, setFormError, targets: { fields, setFieldError, setFormError } };
}

describe('applyApiError', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear());

  it('puts a field error under the matching field and focuses it', () => {
    const { targets, setFieldError, setFormError } = setup();
    applyApiError(
      new ApiError(409, 'Email is already registered', [
        { field: 'email', message: 'Email is already registered' },
      ]),
      targets,
    );
    expect(setFieldError).toHaveBeenCalledWith('email', 'Email is already registered', true);
    expect(setFormError).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('focuses only the first of several field errors', () => {
    const { targets, setFieldError } = setup();
    applyApiError(
      new ApiError(400, 'Validation failed', [
        { field: 'email', message: 'Enter a valid email address' },
        { field: 'name', message: 'Name must be at least 3 characters' },
      ]),
      targets,
    );
    expect(setFieldError).toHaveBeenNthCalledWith(1, 'email', 'Enter a valid email address', true);
    expect(setFieldError).toHaveBeenNthCalledWith(
      2,
      'name',
      'Name must be at least 3 characters',
      false,
    );
  });

  it('sends a field the form does not have to the form-level alert', () => {
    const { targets, setFieldError, setFormError } = setup();
    applyApiError(
      new ApiError(400, 'Validation failed', [{ field: 'role', message: 'role is not allowed' }]),
      targets,
    );
    expect(setFieldError).not.toHaveBeenCalled();
    expect(setFormError).toHaveBeenCalledWith('Validation failed. role is not allowed');
  });

  it('uses the API message for the form alert when there are no field errors (401, 429)', () => {
    const { targets, setFormError } = setup();
    applyApiError(new ApiError(401, 'Invalid email or password'), targets);
    expect(setFormError).toHaveBeenCalledWith('Invalid email or password');
  });

  it.each([
    ['a 5xx', new ApiError(500, 'db exploded at 10.0.0.5')],
    ['a network failure', new ApiError(0, 'Network error, please try again')],
    ['an unknown error', new Error('boom')],
  ])('shows a generic toast for %s and never the server text', (_label, error) => {
    const { targets, setFieldError, setFormError } = setup();
    applyApiError(error, targets);
    expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.');
    expect(setFieldError).not.toHaveBeenCalled();
    expect(setFormError).not.toHaveBeenCalled();
  });
});

describe('getRedirectTarget', () => {
  it.each([
    [{ from: { pathname: '/app' } }, '/app'],
    [undefined, '/app'],
    [null, '/app'],
    [{ from: { pathname: '//evil.com' } }, '/app'],
    [{ from: { pathname: 'https://evil.com' } }, '/app'],
    [{ from: 'nope' }, '/app'],
  ])('%j -> %s', (state, expected) => {
    expect(getRedirectTarget(state)).toBe(expected);
  });
});
