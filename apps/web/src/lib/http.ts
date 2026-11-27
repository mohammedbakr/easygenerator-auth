import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Set once a request has been replayed after a token refresh, so it can't loop. */
    _retried?: boolean;
  }
}

/** Error shape returned by the API's global exception filter. */
interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
}

/** The only error type the rest of the app sees. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? 'Something went wrong');
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

function toApiError(error: unknown): ApiError {
  if (isAxiosError<ApiErrorBody>(error) && error.response) {
    const { message } = error.response.data ?? {};
    const messages = Array.isArray(message) ? message : message ? [message] : [];
    return new ApiError(error.response.status, messages);
  }
  return new ApiError(0, ['Network error, please try again']);
}

/** Same-origin `/api` (Vite proxy in dev, nginx in Docker); cookies carry the session. */
export const http = axios.create({ baseURL: '/api', withCredentials: true });

let onSessionExpired: (() => void) | undefined;

/** Lets the app react to a dead session (e.g. mark the user logged out) without this file knowing about React. */
export function setOnSessionExpired(callback: () => void): void {
  onSessionExpired = callback;
}

// One shared in-flight refresh. Refresh tokens rotate, so parallel refreshes would invalidate each
// other and the server would treat the loser as token reuse and end the session.
let refreshing: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  refreshing ??= http
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function canRefresh(error: unknown): error is { config: InternalAxiosRequestConfig } {
  return (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config !== undefined &&
    !error.config._retried &&
    // /auth/* failures (wrong password, dead refresh token) are final answers, not expired sessions.
    !error.config.url?.startsWith('/auth/')
  );
}

http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!canRefresh(error)) throw toApiError(error);

  try {
    await refreshSession();
  } catch {
    onSessionExpired?.();
    throw toApiError(error);
  }
  error.config._retried = true;
  return http(error.config);
});
