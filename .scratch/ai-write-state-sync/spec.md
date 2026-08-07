# Spec: Page list state sync after AI create-tool writes

**Status:** ready-for-agent

## Problem Statement

When the assistant files an access request or an expense through a chat tool, the row is created server-side, but the page's list is stale: the panel fetched on mount and never refreshes. The AI's write is invisible on the page until a full reload, so a user gets two contradictory views — the chat confirms the row, the page does not show it. There is no live connection between tool executions (which run in the layout-level chat widget) and the page panel (a sibling mounted in the page route).

## Solution

Per-domain zustand list stores shared by the page panel and the domain's chat create tool. The store becomes the page list's **single source of truth**: the panel subscribes to it, and after a successful create POST the tool upserts the created row into it, so the list updates in place the moment the AI write lands. This extends the existing precedent where tools read app state (`account_whoami` reads `useChatStore`) to the write side — a create tool mutates the page's list state on success.

## User Stories

1. As an authenticated user, I want the page list to show the row the assistant created the moment I approve its tool call, so that the page reflects what the assistant did without a reload.
2. As an authenticated user, I want AI-created rows to appear in the same list, with the same columns, badges, and filters as manually created rows, so that there is one consistent view.
3. As an authenticated user, I want a failed create (403, validation error, network) to leave the list untouched, so that no phantom rows ever appear.
4. As an authenticated user, I want upsert semantics, so that a duplicate id replaces the existing row instead of duplicating it in the list.
5. As an authenticated user, I want the same behavior on `/expenses` and `/requests`, so that the pattern is consistent across the template.
6. As an authenticated user, I want the chat widget and the page panel to agree on the list while the page stays open, so that I never have to reload to see AI work.
7. As a template developer, I want a reusable list-store factory (`rows`, `loading`, `forbidden`, `load`, `upsert`) so that a new domain page adopts state sync with a thin store file.
8. As a template developer, I want the create tool to write back with a one-line call after the POST, so that tools stay small and the `ChatTool` contract is untouched.
9. As a template developer, I want the panel to read the store instead of keeping local list state, so that the page has exactly one source of truth for the list.
10. As a template developer, I want the store to be per-browser-tab and not persisted, so that a reload still fetches authoritative server data.
11. As a maintainer, I want unit tests for the store (upsert add/replace, 403 mapping, loading transitions) and for the tool write-back (success upserts, failure does not), so that the sync behavior is pinned.
12. As a maintainer, I want e2e proof that an approved AI create updates the page list without a reload.

## Implementation Decisions

### Shared list-store factory (new module)

- `stores/list-store.ts` — `createListStore<T extends { id: string }>({ fetchUrl })` returns a zustand store (the `create`/zustand pattern already used by `stores/chat-store.ts`; no `persist` — rows are server state).
- State: `{ rows: T[], loading: boolean, forbidden: boolean }` with actions:
  - `load(): Promise<void>` — `GET fetchUrl`; 403 → `forbidden: true` (panel shows the existing `ForbiddenCard`); success → `rows` set, `loading: false`. This maps what `ExpensesPanel.fetchExpenses` / `RequestsPanel.fetchRequests` do today.
  - `upsert(row: T)` — replace the row with the same `id`, else unshift to the front (the lists render newest-first).
- Thin per-domain stores: `features/expenses/store.ts` → `createListStore<ExpenseRow>({ fetchUrl: "/api/expenses" })`; `features/requests/store.ts` → `createListStore<RequestRow>({ fetchUrl: "/api/requests" })`.

### Create tool write-back (existing `ChatTool` seam)

- `expenses_create` and `requests_create` in their `tools.ts`: after `fetchJson` returns `{ ok: true, data: row }`, call `useExpensesStore.getState().upsert(row)` / `useRequestsStore.getState().upsert(row)` and return the result. On `ok: false` (403/error), return the error as today and do **not** touch the store.
- The `ChatTool` contract is unchanged; the domain tool imports its domain store, mirroring `account_whoami` importing `useChatStore`.

### Panel refactor (thin, per `business-feature` conventions)

- `ExpensesPanel` / `RequestsPanel`: drop the local `rows`/`loading`/`forbidden` state; read them from the store hook; `useEffect` calls `load()` on mount.
- Create-submit path (`handleSubmit`): on POST ok, `upsert(createdRow)` (same helper as the tool) instead of refetching — both routes into creation update state identically.
- Decision/cancel actions keep refetching the list (`store.load()`) as today, since they mutate existing rows' status.
- No other page/component changes; the chat scope, rendering, and i18n are untouched.

### Mock model routing

- No change: create intents already route to the create tool via `pickToolIntent`; state sync happens automatically in `execute`.

### Explicitly not done

- No DB table, no API route, no `requireApiAction` permission, no `lib/nav.ts` / `lib/constants.ts` change. `load()` reuses the existing ACL-guarded list routes, so the security boundary is unchanged.

## Testing Decisions

- **What makes a good test:** assert external behavior — the list shows the created row right after an approved AI write, upserts never duplicate, and failures leave the list unchanged. Pure logic is unit-tested at the store/tool seams; the visible loop is e2e-tested through `AI_MOCK`.
- **Vitest — store factory (new `stores/__tests__/list-store.test.ts`):** `upsert` adds a new row, replaces an existing id without duplicating, unshifts newest-first; `load` sets rows, maps 403 → `forbidden`, and flips `loading`. Stub global `fetch`. This is a new pattern (no prior store tests); the factory is pure and mockable.
- **Vitest — tool write-back (new test or extend domain `__tests__`):** run the domain tool's `execute` with a stubbed fetch: success → the row appears in `useExpensesStore`/`useRequestsStore` state; 403/validation failure → store unchanged and result `ok: false`. Prior art: `features/expenses/lib/__tests__/*`, `features/chat/lib/__tests__/approval.test.ts`.
- **Docker Playwright e2e with `AI_MOCK=1` (extend `e2e/expenses.spec.ts` / `e2e/requests.spec.ts` or add a case):** on `/expenses`, ask the assistant to file an expense, approve the tool card → the page's expense table shows the new row (mock-generated values) immediately, with no reload; repeat on `/requests`. Prior art: `e2e/chat.spec.ts`, `e2e/expenses.spec.ts`, `e2e/requests.spec.ts`. Note: six `chat.spec.ts` scenarios currently fail in this environment with changes stashed — pre-existing, not caused by this feature.

## Out of Scope

- Reflecting non-create writes (approve/reject/cancel/reopen) via `upsert` — decision actions keep refetching through `load()`.
- Optimistic rollback/undo, offline queues, or retry semantics.
- Cross-tab / realtime sync (WebSocket, server push); the store is per-tab and the server list route remains authoritative on reload.
- Persisting the store with `persist` middleware — rows are server state and must not be cached to local storage.
- The form-fill tool (validates proposed data, never writes) — tracked in the separate `.scratch/form-fill-tool` spec.

## Further Notes

- The widget is mounted in the dashboard layout and the panel in the page route, so tools and panels can only share state through a store; `createListStore` is that shared seam and keeps the store shape identical across domains so the panel refactor is mechanical.
- This feature and `.scratch/form-fill-tool` are complementary halves of "the assistant and the page share state": one reads the page's form definition to validate, the other writes the page's list after acting. Both stay inside the `ChatTool` contract.
