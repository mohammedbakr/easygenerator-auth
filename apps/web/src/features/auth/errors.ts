import { toast } from 'sonner';
import { ApiError } from '@/lib/http';

interface ErrorTargets<TField extends string> {
  /** The field names this form actually has. */
  fields: readonly TField[];
  /** Put a message under one of those fields (`focus` is true for the first one). */
  setFieldError: (field: TField, message: string, focus: boolean) => void;
  /** Put a message in the form-level alert region. */
  setFormError: (message: string) => void;
}

/**
 * Turns an API failure into the right place on screen, without knowing any status codes:
 * network/5xx -> toast; field errors -> under the matching input; everything else -> form alert.
 */
export function applyApiError<TField extends string>(
  error: unknown,
  { fields, setFieldError, setFormError }: ErrorTargets<TField>,
): void {
  if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500) {
    // Never show server text for these: it is either missing or not meant for users.
    toast.error('Something went wrong. Please try again.');
    return;
  }

  const isFormField = (field: string): field is TField =>
    (fields as readonly string[]).includes(field);
  const matched = error.fieldErrors.filter((e) => isFormField(e.field));
  const unmatched = error.fieldErrors.filter((e) => !isFormField(e.field));

  matched.forEach((e, index) => {
    if (isFormField(e.field)) setFieldError(e.field, e.message, index === 0);
  });

  const lines = [
    ...(matched.length === 0 ? [error.message] : []),
    ...unmatched.map((e) => e.message),
  ];
  if (lines.length > 0) setFormError(lines.join('. '));
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
