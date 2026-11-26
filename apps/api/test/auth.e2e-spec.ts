import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import type { Response } from 'supertest';
import { User } from '../src/modules/users/schemas/user.schema.js';
import { createTestApp, type TestApp } from './helpers/test-app.js';

const PASSWORD = 'S3cure!pass';

let counter = 0;
const uniqueEmail = () => `user${++counter}@example.com`;

function setCookies(res: Response): string[] {
  const header = res.headers['set-cookie'] as unknown;
  return Array.isArray(header) ? (header as string[]) : [];
}

function cookieValue(res: Response, name: string): string {
  const cookie = setCookies(res).find((c) => c.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Cookie ${name} not set`);
  return cookie.split(';')[0].slice(name.length + 1);
}

describe('auth (e2e)', () => {
  let testApp: TestApp;
  let users: Model<User>;
  const server = () => testApp.app.getHttpServer();

  const signUp = (email = uniqueEmail(), password = PASSWORD) => ({
    email,
    name: 'Jane Doe',
    password,
  });

  beforeAll(async () => {
    testApp = await createTestApp();
    users = testApp.app.get<Model<User>>(getModelToken(User.name));
    // Build the unique email index before any test relies on it (duplicate test would be flaky).
    await users.syncIndexes();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('runs the full flow: signup -> me -> logout -> me 401 -> signin -> refresh -> me', async () => {
    const agent = request.agent(server());
    const body = signUp();

    const signup = await agent.post('/api/auth/signup').send(body).expect(201);
    expect(signup.body).toEqual({ id: expect.any(String), email: body.email, name: 'Jane Doe' });

    await agent
      .get('/api/users/me')
      .expect(200)
      .expect(({ body: me }) => {
        expect(me).toEqual(signup.body);
      });

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/users/me').expect(401);

    await agent
      .post('/api/auth/signin')
      .send({ email: body.email, password: PASSWORD })
      .expect(200);
    await agent.post('/api/auth/refresh').expect(204);
    await agent.get('/api/users/me').expect(200);
  });

  it('sets httpOnly, SameSite=Strict cookies with narrow paths and keeps tokens out of the body', async () => {
    const res = await request(server()).post('/api/auth/signup').send(signUp()).expect(201);

    const cookies = setCookies(res);
    const access = cookies.find((c) => c.startsWith('access_token='));
    const refresh = cookies.find((c) => c.startsWith('refresh_token='));
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=Strict/i);
    expect(access).toMatch(/Path=\/api(;|$)/);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/SameSite=Strict/i);
    expect(refresh).toMatch(/Path=\/api\/auth(;|$)/);
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ|token/i);
  });

  it('stores an argon2id password hash and a SHA-256 refresh hash, never the raw values', async () => {
    const body = signUp();
    const res = await request(server()).post('/api/auth/signup').send(body).expect(201);

    const stored = await users
      .findOne({ email: body.email })
      .select('+passwordHash +refreshTokenHash')
      .lean();
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored?.passwordHash).not.toContain(PASSWORD);
    expect(stored?.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.refreshTokenHash).not.toBe(cookieValue(res, 'refresh_token'));
  });

  it('normalises email, and rejects a duplicate that differs only by case or spacing (409)', async () => {
    const email = uniqueEmail();
    const first = await request(server())
      .post('/api/auth/signup')
      .send({ ...signUp(), email: `  ${email.toUpperCase()}  ` })
      .expect(201);
    expect(first.body.email).toBe(email);

    const dup = await request(server()).post('/api/auth/signup').send(signUp(email)).expect(409);
    expect(dup.body.message).toBe('Email is already registered');
  });

  it.each([
    ['weak password', { password: 'password' }],
    ['short name', { name: 'Jo' }],
    ['invalid email', { email: 'not-an-email' }],
    ['extra field (role)', { role: 'admin' }],
  ])('rejects signup with %s (400)', async (_label, override) => {
    await request(server())
      .post('/api/auth/signup')
      .send({ ...signUp(), ...override })
      .expect(400);
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const body = signUp();
    await request(server()).post('/api/auth/signup').send(body).expect(201);

    const wrong = await request(server())
      .post('/api/auth/signin')
      .send({ email: body.email, password: 'Wrong!pass1' })
      .expect(401);
    const unknown = await request(server())
      .post('/api/auth/signin')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(401);

    expect(wrong.body.message).toBe('Invalid email or password');
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('protects /users/me, logout and rejects refresh without cookies (401)', async () => {
    await request(server()).get('/api/users/me').expect(401);
    await request(server()).post('/api/auth/logout').expect(401);
    await request(server()).post('/api/auth/refresh').expect(401);
  });

  it('rejects a tampered access token', async () => {
    await request(server())
      .get('/api/users/me')
      .set('Cookie', 'access_token=not.a.jwt')
      .expect(401);
  });

  it('detects refresh token reuse: the old token fails and the session is revoked', async () => {
    const agent = request.agent(server());
    const signup = await agent.post('/api/auth/signup').send(signUp()).expect(201);
    const oldRefresh = cookieValue(signup, 'refresh_token');

    await agent.post('/api/auth/refresh').expect(204); // rotates; oldRefresh is now stale

    await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${oldRefresh}`)
      .expect(401);

    // Reuse killed the whole session, so even the legitimately rotated token no longer works.
    await agent.post('/api/auth/refresh').expect(401);
  });

  it('clears the cookies when a refresh fails', async () => {
    const res = await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=garbage')
      .expect(401);
    const cleared = setCookies(res).filter((c) => /Expires=Thu, 01 Jan 1970/.test(c));
    expect(cleared).toHaveLength(2);
  });

  it('keeps /health public', async () => {
    await request(server()).get('/api/health').expect(200);
  });
});
