# Easygenerator Auth

A sign-up / sign-in module: a **NestJS + MongoDB** API and a **React + Vite + TypeScript** web app in one npm-workspaces monorepo. Sessions use short-lived JWTs in httpOnly cookies, so JavaScript never touches a token. Everything runs with one `docker compose` command.

**Features**

- Sign up (email, name, password) and sign in, with the same field rules enforced on the client and the server
- Welcome page for signed-in users, and sign out
- Silent token refresh: an expired access token is renewed in the background and the request is retried
- Rate limiting on sign-up and sign-in
- Swagger API docs, structured logs, health endpoint, tests and CI

AI usage is described in [AI.md](AI.md).

## Quick start (Docker)

You need Docker with Compose. Ports `8080` and `27017` must be free.

```bash
cp .env.example .env
docker compose up --build
```

Open <http://localhost:8080>. API docs (Swagger): <http://localhost:8080/api/docs>.

Stop with `docker compose down` (add `-v` to also delete the database volume).

## Local development

Needs Node 24 (see `.nvmrc`).

```bash
npm install
cp .env.example .env                      # compose reads this, even to start only mongo
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d mongo
npm run dev
```

- Web: <http://localhost:5173> (Vite proxies `/api` to the API, so cookies stay same-origin)
- API: <http://localhost:3000/api>, docs at <http://localhost:3000/api/docs>

Keep each `.env` in sync with its `.env.example` when the example changes. The API refuses to start on a missing or invalid variable and says which one.

## Environment variables

**Root `.env`** (used by `docker-compose.yml`)

| Variable                                    | Purpose                                                | Default       |
| ------------------------------------------- | ------------------------------------------------------ | ------------- |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`   | Signing secrets, at least 32 characters, must differ   | required      |
| `MONGO_INITDB_ROOT_USERNAME` / `_PASSWORD`  | Mongo admin user (not used by the API)                 | required      |
| `MONGO_APP_USERNAME` / `MONGO_APP_PASSWORD` | App user with `readWrite` on `easygenerator-auth` only | required      |
| `VITE_APP_NAME`                             | App name in the page title, baked into the web build   | `Secure Auth` |

The Mongo passwords end up inside `MONGO_URI`, so they must be URL-safe (no `@ : / ? # %`). Generate them with `openssl rand -hex 24`, and the JWT secrets with `openssl rand -base64 48`. `MONGO_INITDB_*` and the app-user script only run on an **empty** volume; changing them later needs `docker compose down -v` (this deletes the data). The values in `.env.example` are local placeholders only.

**`apps/api/.env`**

| Variable                                  | Purpose                                              | Default              |
| ----------------------------------------- | ---------------------------------------------------- | -------------------- |
| `NODE_ENV`                                | `development`, `test` or `production`                | `development`        |
| `PORT`                                    | API port                                             | `3000`               |
| `MONGO_URI`                               | MongoDB connection string                            | required             |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | See above                                            | required             |
| `JWT_ACCESS_TTL_SECONDS`                  | Access token and cookie lifetime                     | `900` (15 min)       |
| `JWT_REFRESH_TTL_SECONDS`                 | Refresh token and cookie lifetime                    | `604800` (7 days)    |
| `CORS_ORIGIN`                             | Allowed web origin (CORS with credentials)           | required             |
| `RATE_LIMIT_PER_MINUTE`                   | Requests per IP per minute, all routes               | `100`                |
| `AUTH_RATE_LIMIT_PER_MINUTE`              | Requests per IP per minute, sign-up and sign-in      | `5`                  |
| `TRUST_PROXY`                             | Trust one proxy hop (`X-Forwarded-For`) behind nginx | `false`              |
| `COOKIE_SECURE`                           | Cookie `Secure` flag                                 | `true` in production |

**`apps/web/.env`**

| Variable        | Purpose                                                                          | Default       |
| --------------- | -------------------------------------------------------------------------------- | ------------- |
| `VITE_APP_NAME` | App name. `VITE_` values are **public** and fixed at build time. No secrets here | `Secure Auth` |

## Scripts

Run from the repo root.

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | API (watch mode) and web dev server together      |
| `npm run lint`      | oxlint in both apps                               |
| `npm run typecheck` | `tsc` in both apps                                |
| `npm test`          | Unit tests (API and web)                          |
| `npm run test:e2e`  | API end-to-end tests against an in-memory MongoDB |
| `npm run build`     | Build both apps                                   |
| `npm run format`    | Prettier                                          |

## Architecture

```text
apps/api   NestJS: modular monolith
apps/web   React + Vite: feature folders
docker/    Mongo init script (creates the app user)
```

**API.** Feature modules (`users`, `auth`, `health`), each layered controller → service → repository. Controllers only handle HTTP (DTOs, cookies, status codes), services hold the rules, and `UsersRepository` is the only code that touches Mongoose. `JwtAuthGuard` is registered globally, so every route needs a valid access cookie unless marked `@Public()`; forgetting the decorator fails closed with 401. Validation, error shape, rate limiting and logging are global, so controllers carry no try/catch.

**Web.** `features/auth` holds the API calls, hooks, zod schemas, forms and route guards. The current user is a React Query query (`useMe`), the single source of truth for the session, so there is no auth context and logout is clearing the cache. Only `lib/http.ts` imports axios; it normalises errors to one `ApiError` and runs the silent refresh.

**Request flow.** The browser only talks to one origin. In Docker, nginx serves the SPA and proxies `/api/*` to the API; in dev, Vite does the same. Cookies therefore stay same-site and CORS never comes into play. On an expired access token the API returns 401, axios calls `/auth/refresh` once (one shared in-flight request for parallel calls), then replays the original request. If refresh fails, the session is cleared and the user lands on `/signin`.

Deliberately not used: hexagonal architecture, CQRS, DDD, Redux. For five endpoints and three pages they would add files without adding value.

## Auth design

- **Passwords:** argon2id. The hash is never returned or logged.
- **Tokens:** a 15-minute access JWT and a 7-day refresh JWT, each signed with its own secret, in httpOnly, `SameSite=Strict` cookies (`Secure` in production). The access cookie has path `/api`; the refresh cookie only `/api/auth`, so normal calls never carry it. Tokens are never in response bodies or `localStorage`.
- **Refresh rotation:** every refresh issues a new pair. The refresh token is stored as a SHA-256 hash (enough for a long random token; argon2 is for low-entropy passwords) and compared in constant time. The swap is an atomic compare-and-set, so a reused or raced token loses and the session is ended.
- **Sign-in failures:** unknown email and wrong password return the same `401 Invalid email or password`, and an argon2 verification runs either way so timing doesn't reveal which emails exist.
- **Rate limits:** 5 per minute per IP on sign-up and sign-in, 100 per minute elsewhere (in-memory, sliding 60-second window: each request counts for 60 seconds). Exceeding the limit returns 429 and blocks that client for 60 seconds.
- **Fields:** email is trimmed and lowercased with a unique index (a duplicate is detected from the Mongo `11000` error, not a find-then-insert race); name 3-50 characters; password 8-64 characters with a letter, a number and a special character. The password rule is Unicode-aware, so letters and digits from any script count.

## API

All routes are under `/api`. Interactive docs: `/api/docs`.

| Method | Path            | Auth           | Body                        | Success                             | Errors                               |
| ------ | --------------- | -------------- | --------------------------- | ----------------------------------- | ------------------------------------ |
| POST   | `/auth/signup`  | Public, 5/min  | `{ email, name, password }` | 201 `{ id, email, name }` + cookies | 400 validation, 409 email taken, 429 |
| POST   | `/auth/signin`  | Public, 5/min  | `{ email, password }`       | 200 `{ id, email, name }` + cookies | 400, 401 invalid credentials, 429    |
| POST   | `/auth/refresh` | Refresh cookie | none                        | 204 + rotated cookies               | 401                                  |
| POST   | `/auth/logout`  | Access cookie  | none                        | 204, cookies cleared                | 401                                  |
| GET    | `/users/me`     | Access cookie  | none                        | 200 `{ id, email, name }`           | 401                                  |
| GET    | `/health`       | Public         | none                        | 200 `{ status: "ok" }`              | 503                                  |

**Error shape.** Every error is `{ statusCode, message, errors?, path, timestamp }`. `message` is always one string. `errors` is an optional list of `{ field, message }` and appears only on 400 validation and 409 duplicate email. 401 and 429 carry no `errors`, and 5xx only says "Internal server error" (details go to the log, never to the client).

## Security summary

- helmet on the API; nginx adds a strict Content-Security-Policy, `X-Frame-Options`, `X-Content-Type-Options` and `Referrer-Policy`, and hides its version
- `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` rejects unknown fields like `role`; every field has a max length
- Environment validated at startup (zod); the app refuses to start on bad config; separate access and refresh secrets
- MongoDB requires authentication; the API uses a least-privilege app user (`readWrite` on one database), and the port is published on `127.0.0.1` only
- Logs redact cookies, authorization headers and passwords, and contain no IP addresses
- Containers run as non-root; `.env` files are git-ignored and kept out of images

## Testing and CI

- **API unit tests:** auth service (hashing, duplicates, wrong password, unknown email, refresh reuse), signup DTO rule table, error filter, validation error factory, env schema
- **API e2e (supertest + in-memory MongoDB):** the full flow signup → me → logout → sign in → refresh → me, cookie flags, 401/409/429 cases. No running Mongo or real secrets needed
- **Web tests (Vitest + Testing Library):** zod schemas, sign-up and sign-in forms, error placement, route guards, the silent-refresh interceptor

GitHub Actions (`.github/workflows/ci.yml`) runs on pushes to `main` and on pull requests:

- **checks:** lint, typecheck, unit tests, e2e tests, build
- **docker:** builds both images (nothing is pushed)

## Deployment notes

- The compose file runs over plain `http://localhost` with `COOKIE_SECURE=false`, because Safari drops `Secure` cookies on plain http. Behind HTTPS set `COOKIE_SECURE=true`.
- Keep the API and web on the same site. With the web on Vercel and the API elsewhere, add a rewrite for `/api` to the API, or use subdomains of one parent domain, so the cookies stay first-party. `SameSite=Strict` cookies will not work cross-site.
- Set `TRUST_PROXY=true` only when the API really sits behind one trusted proxy, otherwise clients could spoof their IP.

## Known limitations and next steps

- **Two-tab refresh race:** two tabs refreshing at the exact same moment can make one lose the rotation. It fails safe (that tab is signed out). A short grace window or a 409 retry would fix it.
- **Access token after sign-out:** a stolen access token stays valid until it expires (up to 15 minutes). The refresh token is revoked immediately.
- **Rate limiting** is in memory and per IP. Several API instances need a shared store (Redis); per-account lockout would also help.
- **Validation is duplicated** on client and server (zod and class-validator). A shared validation package would remove drift; for example the two email validators can disagree on rare edge cases. The server is the source of truth.
- Not built: email verification, password reset, error `code`s for translation, Playwright end-to-end tests, HTTPS/TLS termination and continuous deployment.
- An email-availability check with a Bloom filter only makes sense at very large scale; the unique index stays the source of truth either way.

## MongoDB Compass

Connect as the app user (values from your root `.env`):

```text
mongodb://<MONGO_APP_USERNAME>:<MONGO_APP_PASSWORD>@localhost:27017/easygenerator-auth?authSource=easygenerator-auth
```

For admin access, use the root user with `?authSource=admin`. The port is only reachable from your own machine.
