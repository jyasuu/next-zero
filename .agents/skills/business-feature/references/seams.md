# Seam catalog

Facts and mechanics for the template's seams. The reference slice is `features/requests/`; everything below is the shape it uses.

## Module layout

```
features/<name>/
  components/               feature UI (client components)
  hooks/                    feature-specific hooks
  lib/                      PURE logic: state machine, zod schemas, visibility rules (no DB/session)
  lib/__tests__/            Vitest tests for the pure logic
  server/                   server-only DB access + session->actor mapping
  tools/                    ChatTool definitions (when chat is in the slice)
  <name>-chat-scope.tsx     page-scope chat wrapper (when chat is in the slice)
```

- `types/` is optional: shared client/server types may live in `lib/visibility.ts` (the exemplar's choice) or a `types/` file when the module needs them.
- Pure logic first; DB access lives in `server/` or in API routes; components never touch the DB.
- The pure checks are the single source of truth for both the API and the UI — see `features/requests/lib/visibility.ts`, used by both `app/api/requests/*` and `components/requests-panel.tsx`.

## Data seam — `lib/db/index.ts`

- Append to `SCHEMA_STATEMENTS`: `CREATE TABLE IF NOT EXISTS <name> (...)` plus a `CREATE INDEX IF NOT EXISTS` on the owner + created_at lookup. All tables share: `id TEXT PRIMARY KEY`, owner as `<owner>_email TEXT NOT NULL` (convention: `requester_email`, `user_email`), TEXT timestamps (`created_at`, `updated_at`), statuses as TEXT with a `DEFAULT`.
- Query seam: `queryAll(sql, params)`, `queryRow(sql, params)`, `run(sql, params)` from `@/lib/db`. `SqlParams = (string | number | boolean | null)[]`.
- Roles seed: `INSERT INTO roles ... ON CONFLICT (id) DO NOTHING` lists each role's `permissions` JSON array and a `policies` JSON with `{"Effect":"Allow","Action":["<domain>:<Action>", ...]}`. Add new actions to the `Action` array of each role the spec grants. Fresh DBs seed directly. **Existing dev DBs silently skip seed changes** — `IF NOT EXISTS` + `DO NOTHING` do not re-apply — so before an e2e run against a pre-existing database, recreate the DB (e.g. `docker compose stop postgres && docker compose rm -f postgres && docker compose up -d postgres`) or re-seed it, or the permission tests pass against stale data.

## ACL — `lib/api-acl.ts`, `lib/acl.ts`

- `requireApiAction(method, domain)` maps GET→Read, POST→Create, PUT→Write, DELETE→Delete and returns `{ ok: true, session } | { ok: false, response }`; `requireApiVerb(verb, domain)` for explicit verbs. Both return 403 when unauthenticated or unauthorized.
- `ability(role, isAdmin)` → `can(action, resource?)`; `isAdmin` bypasses all checks. Domain actions look like `requests:Read`, `requests:Create`, `requests:Approve`.
- Page gate: `lib/nav.ts` `navRouteActions()` derives `href -> requiredAction`; `app/(dashboard)/layout.tsx` redirects a user who lacks the action. Register nav items with `requiredAction`.
- Role-editor vocabulary: add the new domain + actions to `permissionDomains` in `lib/constants.ts`.

## API routes — `app/api/<name>/...`

- Each route: `export const dynamic = "force-dynamic"`; guard first (`requireApiAction("GET", "<domain>")`), then run the pure `lib/` checks, then act.
- Zod: `.strict()` on create schemas; `safeParse` the body; 400 with `{ error, issues }` on failure.
- State machines: reject illegal transitions with 409 and a message; decisions are idempotent by construction (a repeated approve on an approved row is refused, not re-applied).
- IDs: `String(Date.now())` (template convention; no UUID dependency).

## i18n — `messages/en.json`, `messages/zh.json`

- Each page's namespace is a top-level key (`"requests": { ... }`) fetched via `getTranslations("<name>")`. Nav labels live under `"nav"` (`nav.requests`). Both locales must carry the same keys; no hardcoded user-facing strings.

## Chat seam — `features/chat`

- `ChatTool` type: `{ id, name, description, inputSchema: ZodTypeAny, approval: "always" | "auto", execute }`.
- `approval: "always"` → the human approves via the tool-approval card before execution (use for anything that mutates). `approval: "auto"` → executes immediately (reads).
- A page mounts tools via a scope component: `ChatToolScope` from `@/features/chat/components/chat-scope`, wrapped in a `<Name>ChatScope` (see `requests-chat-scope.tsx`).
- Tools call the same `/api/<name>` routes via `fetchJson` (`@/features/chat/tools/fetch-json`).
- Mock model: `AI_MOCK`'s `pickToolIntent` routes by verb — "create/…" → a tool whose id contains `create`, "list/…" → `list`. Check before adding a tool that doesn't match the pattern.

## Tests

- Vitest: `pnpm test` (`vitest.config.ts`). Pure-logic tests co-located in `lib/__tests__/`; component tests next to components (`components/__tests__/`). Assert external behaviour — what the system permits/denies — not implementation details.
- Typecheck: `pnpm exec tsc --noEmit` (tsconfig has `noEmit: true`). Lint: `pnpm lint`.
- Docker e2e: Playwright against the compose stack (`docker compose up -d --build`), critical flows only. Reference: `e2e/requests.spec.ts`, `e2e/chat.spec.ts`. Mock auth + `AI_MOCK=1` cover the AI path.

## The reference slice

`features/requests/` + `.scratch/access-requests/spec.md` is the canonical example of every seam above in one module, including both approval patterns: the **workflow approval** (requester submits, approver decides) and the **AI tool approval** (assistant proposes, current user approves before execution).
