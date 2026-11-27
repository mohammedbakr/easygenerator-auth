import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { ApiError, http, setOnSessionExpired } from './http';

/** A tiny fake server behind axios: the access token is "valid" only after a successful refresh. */
function fakeServer({ refreshWorks = true, refreshGrantsAccess = true } = {}) {
  const calls: string[] = [];
  let accessValid = false;

  const response = (config: InternalAxiosRequestConfig, status: number, data: unknown) => ({
    data,
    status,
    statusText: '',
    headers: {},
    config,
  });
  const reject = (config: InternalAxiosRequestConfig, status: number) =>
    Promise.reject(
      new AxiosError(
        'fail',
        'ERR_BAD_REQUEST',
        config,
        null,
        response(config, status, { statusCode: status, message: 'nope' }),
      ),
    );

  const adapter: AxiosAdapter = async (config) => {
    const url = config.url ?? '';
    calls.push(url);
    if (url === '/auth/refresh') {
      await new Promise((resolve) => setTimeout(resolve, 10)); // lets parallel requests pile up
      if (!refreshWorks) return reject(config, 401);
      accessValid = refreshGrantsAccess;
      return response(config, 204, null);
    }
    if (url.startsWith('/auth/') || !accessValid) return reject(config, 401);
    return response(config, 200, { url });
  };

  http.defaults.adapter = adapter;
  return { calls, count: (url: string) => calls.filter((c) => c === url).length };
}

describe('silent token refresh', () => {
  const onSessionExpired = vi.fn();
  beforeEach(() => {
    onSessionExpired.mockReset();
    setOnSessionExpired(onSessionExpired);
  });

  it('three parallel 401s trigger exactly one refresh and three retries', async () => {
    const server = fakeServer();
    const results = await Promise.all([http.get('/a'), http.get('/b'), http.get('/c')]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(server.count('/auth/refresh')).toBe(1);
    expect(['/a', '/b', '/c'].map((url) => server.count(url))).toEqual([2, 2, 2]); // 401, then the retry
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('calls onSessionExpired and rejects with the 401 when the refresh fails', async () => {
    const server = fakeServer({ refreshWorks: false });

    await expect(http.get('/a')).rejects.toMatchObject({ status: 401 });
    await expect(http.get('/a')).rejects.toBeInstanceOf(ApiError);
    expect(server.count('/auth/refresh')).toBe(2); // one per request: the shared promise is cleared after settling
    expect(onSessionExpired).toHaveBeenCalledTimes(2);
  });

  it('never refreshes for a 401 on /auth/* (e.g. wrong password)', async () => {
    const server = fakeServer();

    await expect(http.post('/auth/signin', {})).rejects.toMatchObject({ status: 401 });
    expect(server.count('/auth/refresh')).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('retries only once: a 401 after a successful refresh is final', async () => {
    const server = fakeServer({ refreshGrantsAccess: false });

    await expect(http.get('/a')).rejects.toMatchObject({ status: 401 });
    expect(server.count('/auth/refresh')).toBe(1);
    expect(server.count('/a')).toBe(2);
  });
});
