# Spec: Server Admin login with ACL enforcement

**Status:** ready-for-agent

## Problem Statement

Today the app's authorization is cosmetic. The sidebar filters nav items by `requiredAction` using a hardcoded `mockUsers` email→role lookup in constants; users who aren't in that constant (e.g. the Keycloak `testuser`) see an empty sidebar but can still deep-link to any page. The CRUD APIs (`/api/users`, `/api/roles`) perform no permission checks at all, so any authenticated user can create/delete users and roles. There is no way to log in as an administrator with guaranteed top permission independent of any OAuth provider, and no way to grant a user a role through the product that actually changes what they can do.

The desired pattern is Grafana's: a built-in local admin with top permission, OAuth users mapped to roles on first login, role data persisted and grantable by admins, and real enforcement at the route, sidebar, and API layers.

## Solution

A Server Admin model built on the Grafana pattern:

- **Built-in local admin.** A username/password login on the existing `/login` page (above the OAuth buttons) that validates against `ADMIN_USERNAME`/`ADMIN_PASSWORD`. On success the session carries `isAdmin: true`, which grants top permission (an implicit allow-all) regardless of any role.
- **OAuth role resolution, DB-first.** On login the user's email is looked up in the SQLite `users` table. If found, the stored role is the source of truth (admin grants persist across logins). If not found, the JWT's `realm_access.roles` are mapped to an app role via a `ROLE_MAPPING` env JSON and a user row is created with that role. Unmapped users get a row with no role — zero grants, so they cannot access anything under ACL control.
- **Real enforcement.** The dashboard layout guards each route by the nav item's `requiredAction`, redirecting to a `/403` page when the user lacks permission (`/dashboard` stays open to all authenticated users). The sidebar filters using the session role + `isAdmin`. The CRUD APIs enforce granular action checks and return `403` JSON; the UI renders an inline forbidden card when denied.
- **Role policy cache.** Role policies are read from the DB and cached in memory with a 60s TTL, evicted when a role is updated or deleted so grants take effect immediately.

## User Stories

1. As an administrator, I want to sign in with a built-in username and password that does not depend on any OAuth provider, so that I always have a way to reach top permission even when external identity providers are down.
2. As an administrator, I want the login page to show a username/password form above the OAuth provider buttons, so that the built-in admin login is discoverable on the same page.
3. As a Server Admin, I want my session to carry an admin flag that grants every action, so that I can use all product features without role setup.
4. As an OAuth user, I want my role to be determined by my Keycloak realm roles mapped through a configuration, so that my organization can assign roles in the identity provider.
5. As an OAuth user signing in for the first time, I want a user record to be created automatically with my mapped role, so that I am provisioned without manual admin work.
6. As an OAuth user with no mapped role, I want to be treated as having no grants, so that I cannot access any ACL-controlled feature by default.
7. As a Server Admin, I want to see every navigation item in the sidebar, so that I can reach all pages.
8. As a user, I want the sidebar to only show navigation items my role permits, so that I am not exposed to features I cannot use.
9. As a user, I want to be redirected to a dedicated `/403` page when I try to open a page my role does not permit, so that I know access is forbidden rather than seeing an error.
10. As an authenticated user, I want the dashboard to always be reachable, so that I have a landing page even when I have no grants.
11. As a Server Admin, I want to grant a user a role via the users page, so that I can grant permissions through the product.
12. As a user granted a new role, I want the new role to take effect on my next login, so that I gain access to newly granted features.
13. As a Server Admin, I want the users and roles APIs to reject actions I have not permitted, so that the data layer cannot be bypassed by calling the API directly.
14. As a caller of the users or roles API, I want a `403` JSON response when my role lacks the required action, so that client code can distinguish "forbidden" from "error".
15. As a user viewing the users or roles page, I want an inline forbidden card when the API denies an action, so that I get a clear message instead of a silent failure.
16. As a developer, I want the `ability()` helper to treat the admin flag as allow-all, so that top permission is a single code path.
17. As an OAuth user, I want my role to come from the persisted users table on every login after the first, so that admin grants survive re-authentication.

## Implementation Decisions

### Auth

- **Credentials provider** for the built-in admin in the NextAuth config, validated against `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars. The `jwt` callback stamps `isAdmin: true` for credentials logins.
- **DB-first role resolution.** On login: look up `session.user.email` in the SQLite `users` table.
  - Found → the stored `role` is authoritative.
  - Not found → read `realm_access.roles` from the provider access token, map through `ROLE_MAPPING`, and create a `users` row with the mapped role (or no role when unmapped).
- **JWT/session shape:** `token.role`, `token.isAdmin` → `session.user.role`, `session.user.isAdmin`. Type augmentation extended in the existing `types/next-auth.d.ts`.
- **`ROLE_MAPPING`** env JSON, e.g. `{"admin":"Admin","editor":"Editor","viewer":"Viewer"}`. Consistent with the existing `AUTH_PROVIDERS` JSON env pattern.
- **Keycloak realm export:** `testuser` gets no realm roles, proving the "no default grants" path. `ROLE_MAPPING` and admin credentials added to `docker-compose.yml` and `.env.local` (dev defaults `admin`/`admin`).

### ACL

- **`ability()`** (in the ACL module): when `isAdmin` is true, `can(action, resource?)` always returns `true`.
- **Route guard** in the dashboard layout: reuse the nav `requiredAction` map (href → action) from constants; `/dashboard` has no requirement. Denied → redirect to `/403`. A styled `/403` page is added.
- **Sidebar:** takes role + `isAdmin` from the session (replacing the `mockUsers` lookup); filters nav items by `can(requiredAction)`.
- **API enforcement (granular):** `GET` → `:Read`, `POST` → `:Create`, `PUT` → `:Write`, `DELETE` → `:Delete` for both `/api/users*` and `/api/roles*`. `isAdmin` short-circuits. Unauthorized → `403` JSON.
- **Role policy cache:** in-memory map of role name → parsed policies, 60s TTL, evicted on role update/delete through the roles API. Looked up per request; fresh logins are unaffected by stale cache.

### Data

- **Seed change:** add `audit:Read` to the Editor role policy so Editors can view the audit log.
- **Users table:** supports rows with an empty role (no grants). No schema change required; the existing `role` column accepts the empty string.

## Testing Decisions

Good tests assert external behavior — what the user can and cannot do — not implementation details. The primary seam is Playwright e2e (existing prior art: `e2e/auth.spec.ts`, `e2e/pages.spec.ts`, shared storage-state setup). A secondary Vitest seam covers pure logic (existing prior art: `lib/__tests__/acl.test.ts`).

**Vitest** (`lib/__tests__/`):
- `ability()` returns allow-all when `isAdmin` is true, regardless of role.
- `ROLE_MAPPING` parsing: valid JSON maps realm roles; unmapped roles resolve to no role; malformed JSON is handled.
- Role cache: entries expire after TTL; update/delete evicts.

**Playwright e2e:**
- **Setup project swap:** all existing tests (auth, page user stories, Users CRUD, Roles CRUD) run as the built-in admin via a new `e2e/admin.setup.ts` storage state. A `user.json` state is retained for the Keycloak `testuser`.
- **Block A — admin top permission:** admin login succeeds; sidebar shows all items; `/users` and `/roles` render.
- **Block B — default no grants:** `testuser` first login auto-creates a no-role row; `/users` redirects to `/403`; the users API returns `403` and the page renders the inline forbidden card.
- **Block C — grant permission:** admin promotes `testuser@example.com` to Editor via the `/users` page; logout; `testuser` logs in again; `/users` now loads. Revoke at the end so the suite stays idempotent across runs.

Test isolation: the app container is recreated on each `docker compose run --rm e2e` (no volume), so the SQLite DB is fresh per run.

## Out of Scope

- API ACL enforcement for endpoints other than users/roles (e.g. audit log, API keys, reports) — those pages are route-guarded but their data endpoints are unchanged.
- Multi-tenant / organization-scoped permissions.
- Postgres migration — the DB access layer is intentionally the only seam touching storage; moving to Postgres later must not change the ACL or auth design.
- Runtime-editable role mapping (a `role_mappings` table / UI). Mapping stays config-only for now.
- Role grants via Keycloak group membership.
- Session revocation / remote logout.

## Further Notes

- The Keycloak `testuser` is intentionally left without realm roles in the realm export. The `ROLE_MAPPING` config is still exercised: any new OAuth user without an existing `users` row is seeded from their realm roles on first login.
- Grant/revoke round-trips are immediate for fresh logins because role resolution reads the DB; the 60s role-policy cache only affects mid-session API calls after a role edit, and role edits evict the cache.
- The `/403` page and the inline forbidden card share copy/translations so the "forbidden" concept has one consistent message.
