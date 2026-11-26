import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/test-app.js';

describe('auth rate limiting (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    // Production defaults for the auth bucket: 5 attempts per minute.
    testApp = await createTestApp({ AUTH_RATE_LIMIT_PER_MINUTE: '5' });
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('answers the 6th sign-in within a minute with 429', async () => {
    const attempt = () =>
      request(testApp.app.getHttpServer())
        .post('/api/auth/signin')
        .send({ email: 'nobody@example.com', password: 'Wrong!pass1' });

    for (let i = 0; i < 5; i++) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);
    expect(blocked.body.message).toBe('Too many requests, please try again in a minute');
  });
});
