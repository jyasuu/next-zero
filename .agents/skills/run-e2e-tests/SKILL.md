---
name: run-e2e-tests
description: Run Playwright e2e tests for the Next.js enterprise app. Use when the user
  asks to run e2e tests, run Playwright, test authentication, or verify the Keycloak
  login flow. Also use when asked about Docker Compose e2e setup.
---

# Run E2E Tests

Run the Playwright end-to-end test suite for the Next.js enterprise app. The project
uses Auth.js with Keycloak as the auth provider.

## Test Files

All e2e tests are in `./e2e/`.

- `auth.setup.ts` — setup project (runs first): signs in with Keycloak, saves
  `storageState` to `e2e/.auth/user.json` for downstream tests.
- `auth.spec.ts` — 3 standalone auth tests: redirect unauthenticated to login,
  render login page with "Enterprise App" heading, sign in with Keycloak.
- `pages.spec.ts` — 6 authenticated page tests (uses saved auth state): dashboard
  metrics, users table search/pagination, settings tabs, profile pre-filled form,
  notifications unread count, audit log pagination.

The `playwright.config.ts` defines two projects:
1. **setup** — runs `auth.setup.ts` first
2. **chromium** — depends on setup, runs `*.spec.ts` tests with the shared auth state

Run a single file:

```bash
pnpm exec playwright test e2e/pages.spec.ts
```

## Run Locally (no Docker)

Playwright auto-starts the Next.js dev server on port 3001 when `PLAYWRIGHT_BASE_URL`
is unset:

```bash
pnpm exec playwright test
```

## Run in Docker

The `docker-compose.yml` has three services: `keycloak`, `app`, `e2e`.

```bash
docker compose up -d --build
```

This starts:
1. **keycloak** — 26.1.0, imports `keycloak/realm-export.json`, admin at
   http://localhost:8080 (admin/admin)
2. **app** — the Next.js production build served on port 3000
3. **e2e** — runs `pnpm install && pnpm exec playwright test` automatically

View test output:

```bash
docker logs next-zero-e2e-1
```

### Re-run tests without rebuild

If the app is already running and the image hasn't changed:

```bash
docker compose run --rm e2e sh -c "npm install -g pnpm@8.15.6 && pnpm install --frozen-lockfile && pnpm exec playwright test"
```

### Interactive debugging

```bash
docker compose run --rm e2e sh
```

Then inside the container:

```bash
npm install -g pnpm@8.15.6
pnpm install --frozen-lockfile
pnpm exec playwright test --headed --project=chromium
```

## Key Details

- **Multi-label hostnames:** Chrome 151 (Playwright v1.62.0) auto-upgrades HTTP to
  HTTPS for single-label Docker hostnames (`app`, `keycloak`). The compose file
  works around this by using `--network-alias` to register `app.local` and
  `keycloak.local`. All env vars (`NEXTAUTH_URL`, `PLAYWRIGHT_BASE_URL`,
  `KEYCLOAK_ISSUER`, `KC_HOSTNAME_URL`) use these multi-label hostnames.
- **Playwright config** (`playwright.config.ts`): uses `PLAYWRIGHT_BASE_URL` env var
  when set (Docker mode); otherwise starts a dev server on port 3001. The config
  defines a `setup` project (runs `auth.setup.ts` first) that the `chromium` project
  depends on — auth state is shared via `storageState` at `e2e/.auth/user.json`.
- **pnpm version:** The Docker image (Node 22-alpine) uses corepack to pin
  pnpm@8.15.6. The e2e service installs the same version via `npm install -g`.
- **Keycloak realm:** Public client `next-zero-app` with `redirectUris: ["*"]`,
  `webOrigins: ["*"]`. Test user `testuser` / `TestPass123!`.
- **AUTH_SECRET:** Set to `dev-secret-not-for-production` for local/Docker testing.
