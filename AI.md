# AI usage

## How I used AI

I ran this project like a lead working with two assistants: I owned the scope, the design and every decision, and the AI did most of the typing.

- **Me:** scope, architecture, the security model, design direction, what to build and what to cut. Nothing went in without my approval, and I reviewed and committed every change myself.
- **Claude Code (terminal), the implementer:** one small group of work at a time, always plan first.
- **Claude (chat), a second reviewer:** helped me plan the phases, and reviewed Claude Code's plans and diffs against the actual code before I approved them. A separate model reviewing the implementer caught issues the implementer's own checks missed.
- **`CLAUDE.md`:** the project rules in one place (field rules, security rules, API contract, architecture, decisions), so every session followed them without me repeating them.

## Workflow

1. Claude Code proposes a **plan**. I approve, change or reject it.
2. It implements in **small groups**, each ending with lint, typecheck, tests, build and a behaviour check (curl flows with a cookie jar, `docker compose up`).
3. It stops with a Conventional Commit message and the file list. **I review the diff and commit.**
4. What automated tests can't see (layout, touch targets, Safari cookies, CSP errors in the console), I test by hand.

## What was AI-assisted

| Area                               | AI share                                | My part                                                                                                                                |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| API bootstrap (config, logs, docs) | Mostly generated                        | Reviewed config and logging scope; approved removing the scaffold's telemetry                                                          |
| Auth (tokens, rotation, guards)    | Generated from the rules in `CLAUDE.md` | Set the requirements (httpOnly cookies, refresh rotation, identical 401s), reviewed the flow end to end, approved the review fixes     |
| API tests                          | Generated                               | Reviewed coverage; tests were proven by breaking code on purpose and watching them fail                                                |
| Web layer (routing, API, session)  | Generated                               | React Query as the single session source; replaced the frontend's status-code error mapping with a structured API error contract       |
| Forms and UI                       | Generated                               | Design direction (palette, light theme, English only); found UI bugs by hand; asked for the mobile review                              |
| Docker, nginx, compose, CI         | Generated                               | Chose the full production setup; required database authentication; verified cookies, CSP and rate limiting in the browser and terminal |
| README and this file               | Drafted from my notes                   | Edited, corrected facts, removed anything I wouldn't stand behind                                                                      |

## Approaches that worked

- **Rules in `CLAUDE.md` once** instead of in every prompt.
- **Plan first, small groups, stop after each** with a commit message and file list. Small diffs were easy to review properly.
- **Two models with separate roles:** one implements, the other reviews against the real code. They caught each other's mistakes.
- **Proof by behaviour**, not "it should work": curl flows, a second client to prove `trust proxy`, reading the database without credentials, breaking code on purpose to see tests fail, and running library code to settle disagreements.

## Decisions and corrections

### Decisions I made or pushed back on

- **Error handling:** I rejected the frontend's status-code switch ("409 = email field"). It breaks as soon as another unique field exists. The API now returns field-level `errors`, and the form places them by field name without knowing any status codes.
- **Database security:** the compose Mongo had no authentication. I required it: a root user, an app user with only `readWrite` on one database for the API, and the port bound to localhost only.
- **Full production setup:** I chose Dockerfiles, nginx and CI over a lighter "database in compose only" option that was suggested to save time.
- **Design direction:** an emerald palette adapted from a previous project of mine, light theme only, English only.
- **Git ownership:** the AI never runs git. I review and commit every change, and I chose how branches are merged.
- **Challenging before accepting:** I questioned the repository layer, React Query versus SWR (which I'd used before), nginx versus platform rewrites, two Dockerfiles, keeping `CLAUDE.md` public, and extra dev dependencies. Each stayed only once the reason held up; the duplicate Prettier and an unused package were removed.
- **Scope:** I considered a Bloom filter for email checks and dropped it as over-engineering at this scale; the unique index stays the source of truth. I also dropped README screenshots.

### Caught by AI review, approved by me

- Refresh rotation could race (two requests with the same token could both pass): now an atomic compare-and-set, and a lost swap counts as token reuse.
- The password regex used `[A-Za-z]`, so Arabic passwords were rejected and Arabic letters counted as "special". It is now Unicode-aware (`\p{L}`, `\p{N}`), mirrored exactly on the web, with tests.
- Every Mongo `11000` error was mapped to "email taken"; it now checks `keyPattern.email`.
- Logout set the user to `null` and then cleared the cache, which wiped the `null` and caused a pointless refetch; the order is reversed. The session query uses `staleTime: Infinity`.
- Mongo's port was published on all interfaces; it is now `127.0.0.1` only. nginx gained a CSP and `server_tokens off`; the API container runs with `init: true`.
- Google-hosted fonts became self-hosted Inter (no third-party request). The amber warning colour fails text contrast, so it is never used for text.
- The implementer claimed the rate limiter used a fixed window. I settled it by running `ThrottlerStorageService` directly (hits at 0, 600 and 1100 ms allowed, 1200 ms blocked): it is a sliding window.
- The implementer flagged the `cn` package as accidental; it is shadcn's class-merging package, so it stayed.
- An empty `VITE_APP_NAME` build arg would have produced a blank title (`??` doesn't catch empty strings): the Dockerfile now has a default. Toasts followed the OS dark mode on a light-only app: fixed to light.
- IP addresses stay out of the logs (personal data under GDPR); `trust proxy` was proven by behaviour instead.

### Corrected by the implementing agent during its checks

- The Nest 12 scaffold wired in `@nestjs/observe` telemetry, and its CLI output pushed a sign-up. Removed, with the related package and deploy script.
- `z.coerce.boolean()` turns the string `"false"` into `true`, which would have kept Secure cookies on. Env booleans are parsed explicitly.
- nginx drops inherited `add_header` rules in any location that sets its own, so the security headers live in one shared snippet.
- The CI cache first pointed at a folder mongodb-memory-server doesn't use, so it would always be empty. It now caches the real default.

### Bugs I found by testing by hand

- The password show/hide button jumped when pressed: Tailwind v4's `-translate-y-1/2` centring and shadcn's `active:translate-y-px` write the same CSS variable. Fixed with flex centring.
- In the mobile review I asked for: long emails overflowed at 320–375 px, and inputs, buttons and the toggle were below 40 px touch targets.
- A leftover standalone Mongo container held port 27017 after compose gained authentication, so the dev API failed with "Authentication failed" until it was removed.

jsdom has no layout, so the UI issues could never appear in an automated test.

## What I'd do differently next time

- Run the manual browser and mobile pass as soon as the forms exist, not at the end.
- Set up Docker and database authentication alongside the API from day one, instead of adding them later.
- Ask the AI to verify library behaviour by running it before stating it as fact; those were the places it was confidently wrong.
