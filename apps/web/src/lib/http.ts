import axios, { isAxiosError } from 'axios';

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

http.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toApiError(error)));
