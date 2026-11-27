import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { ApiError, http } from './http';

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError('fail', 'ERR', undefined, undefined, response);
}

describe('http error normalisation', () => {
  const adapterFails = (error: unknown) => () => Promise.reject(error);

  it('maps API errors to ApiError with message and field errors', async () => {
    const errors = [{ field: 'email', message: 'Enter a valid email address' }];
    const err = axiosErrorWith(400, { statusCode: 400, message: 'Validation failed', errors });
    await expect(http.get('/x', { adapter: adapterFails(err) })).rejects.toMatchObject({
      status: 400,
      message: 'Validation failed',
      fieldErrors: errors,
    });
  });

  it('uses an empty fieldErrors list when the API sends none', async () => {
    const err = axiosErrorWith(401, { statusCode: 401, message: 'Invalid email or password' });
    await expect(http.get('/x', { adapter: adapterFails(err) })).rejects.toMatchObject({
      fieldErrors: [],
    });
  });

  it('wraps a single message string', async () => {
    const err = axiosErrorWith(401, { statusCode: 401, message: 'Invalid email or password' });
    await expect(http.get('/x', { adapter: adapterFails(err) })).rejects.toBeInstanceOf(ApiError);
  });

  it('maps network failures to status 0', async () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK');
    await expect(http.get('/x', { adapter: adapterFails(err) })).rejects.toMatchObject({
      status: 0,
    });
  });
});
