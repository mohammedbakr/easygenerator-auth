# Project: easygenerator-auth

Take-home task: sign up / sign in. NestJS + MongoDB API in apps/api, React + Vite + TS web in apps/web.

## Rules

- TypeScript strict everywhere. No `any`.
- Keep the TS version the scaffolders pin. Do not upgrade TypeScript.
- Field rules (must match on client and server):
  - email: valid format, trimmed, lowercased
  - name: trimmed, min 3 chars, max 50
  - password: min 8, max 64, >=1 letter, >=1 number, >=1 special char
- Auth: access JWT (15m) + refresh token (7d) in httpOnly, Secure, SameSite=Strict cookies. Never send tokens in JSON bodies. Never return password or token hashes.
- Sign-in failures always return 401 "Invalid email or password".
- Small modules, thin controllers, logic in services. No speculative features.
- Every phase ends with passing lint, typecheck and tests.
- Before writing code, show a short plan and wait for approval.

## Stack notes

- API is ESM (Nest 12 scaffold): relative imports end in `.js`; tests are Vitest (`vi.fn()`), lint is oxlint.
- oxlint (+ `oxlint-tsgolint`) is installed once, in the root `devDependencies`.
- Web uses shadcn/ui (generated into `src/components/ui`, excluded from lint) and the `@/` alias for `src/`.
- Each workspace keeps its scaffolded TypeScript version (api 6.x, web 7.x).

## Decisions

- Token lifetimes are integer **seconds** in env (`JWT_ACCESS_TTL_SECONDS=900`, `JWT_REFRESH_TTL_SECONDS=604800`). The same number feeds the JWT `expiresIn` and the cookie `maxAge`, so there is no string parsing.
- The refresh token is stored as a **SHA-256 hex** hash and compared with `timingSafeEqual`. SHA-256 is fine because the token is long and random (nothing to brute-force); argon2 is for low-entropy passwords.
- `PASSWORD_REGEX` is Unicode-aware: `/^(?=.*\p{L})(?=.*\p{N})(?=.*[^\p{L}\p{N}]).+$/u`. Letters and digits from any script count; "special" is anything that is neither. The web zod schema must mirror this exact regex.
- Refresh rotation is atomic: swap the stored hash with a compare-and-set update; if it fails, treat it as token reuse.

## Architecture (API)

The backend is a modular monolith: feature modules, each layered controller → service → repository, and every route protected unless marked public.

```text
apps/api/src
├─ main.ts                      # bootstrap only
├─ app.module.ts                # wires modules + global providers
├─ config/                      # env.schema.ts (zod), typed config
├─ database/                    # database.module.ts (Mongoose forRootAsync)
├─ common/
│  ├─ constants/                # validation.constants.ts (PASSWORD_REGEX, length limits)
│  ├─ decorators/               # @Public(), @CurrentUser()
│  ├─ filters/                  # all-exceptions.filter.ts
│  └─ guards/                   # jwt-auth.guard.ts (registered globally)
└─ modules/
   ├─ users/
   │  ├─ schemas/user.schema.ts
   │  ├─ users.repository.ts    # the only class that touches the Mongoose model
   │  ├─ users.service.ts
   │  ├─ users.controller.ts    # GET /users/me
   │  ├─ dto/user-response.dto.ts
   │  └─ users.module.ts        # exports UsersService only
   ├─ auth/
   │  ├─ dto/                   # signup.dto.ts, signin.dto.ts
   │  ├─ services/              # auth.service.ts, token.service.ts, hashing.service.ts
   │  ├─ auth.cookies.ts        # cookie names + options in one place
   │  ├─ auth.controller.ts
   │  └─ auth.module.ts         # imports UsersModule, JwtModule
   └─ health/
```

| Pattern                                         | What it looks like                                                                                                             | Why                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Feature modules with clear dependency direction | Auth depends on Users through the exported `UsersService`; Users knows nothing about Auth                                      | No circular imports, and each module can be explained in one sentence                       |
| Thin controller → service → repository          | Controllers handle HTTP only (DTOs, cookies, status codes). Services hold the rules. The repository is the only Mongoose code. | Services are unit-tested with a fake repository, and swapping the database touches one file |
| Small single-purpose services                   | `TokenService` (sign/verify/rotate), `HashingService` (an abstract class; the argon2 implementation is bound in the module)    | Changing argon2 ↔ bcrypt is one provider line; AuthService reads like the business flow     |
| Secure by default                               | `JwtAuthGuard` registered as `APP_GUARD`; `@Public()` on signup/signin/refresh/health                                          | A forgotten decorator fails closed (401), not open                                          |
| Cross-cutting concerns live in one place        | Global ValidationPipe, exception filter, throttler, pino                                                                       | Controllers carry no try/catch or logging noise                                             |
| Response DTOs                                   | Map the document to `{ id, email, name }` explicitly                                                                           | Stops sensitive fields leaking by accident, on top of the `toJSON` strip                    |

Deliberately not used: hexagonal/clean architecture, CQRS, DDD aggregates. For 5 endpoints they would add files without adding value.

## API contract

All routes are under `/api`. Tokens only ever travel in httpOnly cookies, never in response bodies.

Every error has one shape: `{ statusCode, message, errors?, path, timestamp }`. `message` is always one string; `errors` is an optional `{ field, message }[]` (400 validation, 409 duplicate email). 401/429 carry no `errors`, and 5xx only says "Internal server error".

| Method | Path            | Auth                                       | Body                        | Success                             | Errors                               |
| ------ | --------------- | ------------------------------------------ | --------------------------- | ----------------------------------- | ------------------------------------ |
| POST   | `/auth/signup`  | Public, 5/min                              | `{ email, name, password }` | 201 `{ id, email, name }` + cookies | 400 validation, 409 email taken, 429 |
| POST   | `/auth/signin`  | Public, 5/min                              | `{ email, password }`       | 200 `{ id, email, name }` + cookies | 400, 401 invalid credentials, 429    |
| POST   | `/auth/refresh` | Refresh cookie                             | none                        | 204 + rotated cookies               | 401                                  |
| POST   | `/auth/logout`  | Access cookie                              | none                        | 204, cookies cleared                | 401                                  |
| GET    | `/users/me`     | Access cookie (**the protected endpoint**) | none                        | 200 `{ id, email, name }`           | 401                                  |
| GET    | `/health`       | Public                                     | none                        | 200 `{ status: "ok" }`              | 503                                  |
| GET    | `/docs`         | Public                                     | none                        | Swagger UI                          | none                                 |

## Security checklist

- [ ] Passwords hashed with argon2id; hash never returned or logged
- [ ] Refresh token stored hashed and rotated on every refresh; reuse clears the session
- [ ] Cookies set with `httpOnly`, `sameSite: 'strict'`, `secure` in production, and narrow `path`
- [ ] Same 401 message for unknown email and wrong password; dummy hash check for timing
- [ ] Email trimmed + lowercased; unique index; duplicate handled via error code 11000
- [ ] ValidationPipe with `whitelist` + `forbidNonWhitelisted` (blocks extra fields like `role`)
- [ ] Max lengths on all fields (stops very large inputs from tying up argon2)
- [ ] Rate limiting on sign-in/sign-up; helmet on; CORS limited to `CORS_ORIGIN` with credentials
- [ ] Env validated at startup; separate access and refresh secrets; `.env` in `.gitignore`, `.env.example` committed
- [ ] Logs redact cookies, authorization headers and passwords; 5xx errors logged with a stack, clients get a clean message
- [ ] No stack traces or Mongo errors leak to clients
- [ ] Frontend: no tokens in localStorage; protected routes redirect; logout clears the query cache
- [ ] Before making the repo public, the user searches the history for leaked secrets
