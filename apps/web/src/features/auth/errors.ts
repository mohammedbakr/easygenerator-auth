import { toast } from 'sonner';
import { ApiError } from '@/lib/http';

interface ErrorTargets {
  /** Put a message under a specific field. */
  setEmailError: (message: string) => void;
  /** Put a message in the form-level alert region. */
  setFormError: (message: string) => void;
}

/** Turns an API failure into the right place on screen. */
export function applyApiError(error: unknown, { setEmailError, setFormError }: ErrorTargets): void {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        return setEmailError(error.message);
      case 401:
        return setFormError(error.messages[0] ?? 'Invalid email or password');
      case 429:
        return setFormError(error.message);
      case 400:
        return setFormError(error.messages.join('. '));
    }
  }
  toast.error('Something went wrong. Please try again.');
}

/** Where to go after signing in: the page the guard bounced us from, or /app. */
export function getRedirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state;
    if (typeof from === 'object' && from !== null && 'pathname' in from) {
      const { pathname } = from;
      if (typeof pathname === 'string' && pathname.startsWith('/') && !pathname.startsWith('//')) {
        return pathname;
      }
    }
  }
  return '/app';
}
