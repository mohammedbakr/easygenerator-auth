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
- Web uses shadcn/ui (generated into `src/components/ui`, excluded from lint) and the `@/` alias for `src/`.
- Each workspace keeps its scaffolded TypeScript version (api 6.x, web 7.x).
