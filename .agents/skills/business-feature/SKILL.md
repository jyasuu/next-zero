---
name: business-feature
description: Build business features as complete slices in this Next.js enterprise template — module, data seam, ACL-guarded API, page, i18n, tests. Use when the user wants to build, add, or implement a new feature, module, page, workflow, or data-backed functionality, or when another skill needs this template's feature-building seams.
---

# Business Feature

Build a **slice**: a business feature as a full vertical slice of this template — pure logic at a seam, a data seam, an ACL-guarded API, a page, i18n, and tests. The reference slice is `features/requests/` (built from `.scratch/access-requests/spec.md`); mirror it. A feature is done only when the whole slice is done: a page over unguarded mock data is not a slice.

**Start from a spec.** The feature must already have a spec or tickets. If none exists, run `/to-spec` first and come back. Follow the spec's data story — it decides which seams the slice touches (no new table for a UI-only feature, no chat seam if the spec doesn't call for it).

The outer process lives in `/implement`: tdd at the seams, `/code-review`, commit. This skill supplies the seams.

## Steps

Do them in order. Each ends on a checkable completion criterion. Consult `references/seams.md` for mechanics whenever a step needs them.

1. **Ground in the spec and the exemplar.** Read the spec/tickets; read `CONTEXT.md` and relevant ADRs in `docs/adr/` if present; read `references/seams.md`. Read the living exemplar `features/requests/` end-to-end: `lib/workflow.ts` (pure state machine), `lib/visibility.ts` (pure checks), `lib/form.ts` (zod schema), `server.ts` (DB access), `tools.ts` + `requests-chat-scope.tsx` (chat seam), `components/requests-panel.tsx` (UI).
   *Done when:* you can name every seam the feature touches and the exact `<domain>:<Action>` permissions it needs — or you've flagged a gap in the spec to the human.

2. **Scaffold the module.** Create `features/<name>/` with `components/` and `lib/`. Add `types/` only when shared client/server types need their own file — the exemplar keeps its types in `lib/visibility.ts`. Add `server/` (server-only DB access), `tools/`, and a `*-chat-scope.tsx` only when the spec calls for chat tools. Match the exemplar's file layout.
   *Done when:* the module exists with the named seams, mirroring `features/requests/`.

3. **Write the pure logic first, at the seam.** State machine, zod schemas, and visibility rules live in `features/<name>/lib/` as pure functions — no DB, no session. Test-first per `/tdd`. Model illegal transitions as data, not exceptions (e.g. `transitionStatus(status, action)` returns `{ok: true, next} | {ok: false, error}`). Cover every legal and every illegal transition / valid and invalid input.
   *Done when:* every `lib/` function has a passing unit test in `lib/__tests__/` covering both sides of each rule.

4. **Extend the data seam.** In `lib/db/index.ts`, append a `CREATE TABLE IF NOT EXISTS` to `SCHEMA_STATEMENTS` — only if the spec introduces new data — plus a `CREATE INDEX` on the owner + created_at lookup. Conventions: `id TEXT PRIMARY KEY`, owner identity as `<owner>_email TEXT NOT NULL` (like `requester_email`, `user_email`), TEXT timestamps, statuses as TEXT with a default. Grant the new `<domain>:*` actions in the roles seed `INSERT INTO roles ...` per the spec's role tiers.
   *Done when:* the table and index are in the schema; fresh DBs seed with the new permissions; the feature reads/writes through `queryAll`/`queryRow`/`run`.

5. **Add the API behind the ACL.** Route at `app/api/<name>/...`. Guard every route with `requireApiAction`/`requireApiVerb` from `lib/api-acl.ts` (GET→Read, POST→Create, PUT→Write, DELETE→Delete). Validate bodies with the `lib/` zod schemas. Enforce the *same* pure `lib/` checks the UI uses — the pure logic is the single source of truth for both sides. Statuses: 403 denied, 400 invalid input, 409 illegal state-machine transition; decisions idempotent.
   *Done when:* a caller without the permission gets 403; an illegal transition gets 409; a repeated decision is refused, not re-applied.

6. **Build the page and register nav.** `app/(dashboard)/<name>/page.tsx` is a Server Component: `getTranslations("<name>")`, `auth()`, build the actor from the pure `lib/` checks, render the feature components. Register the route in `lib/nav.ts` with `requiredAction: "<domain>:Read"`, an i18n key, and an icon present in `iconRegistry`; add the domain to `permissionDomains` in `lib/constants.ts`.
   *Done when:* the page renders for a permitted user, is filtered out of the sidebar for others, and direct navigation by a non-permitted user is denied by the layout gate.

7. **Localize.** Add a `<name>` namespace to both `messages/en.json` and `messages/zh.json` (title, description, labels, errors, statuses, actions, empty states) plus the `nav.<name>` key. No hardcoded user-facing strings.
   *Done when:* every user-facing string in the feature comes from a translation key in both locales.

8. **Add the chat seam — only when the spec calls for it.** Contribute `ChatTool`s from a `*-chat-scope.tsx` mounted on the page: `approval: "always"` for anything that mutates (the tool-approval card is the AI path's human check), `approval: "auto"` for reads. Tools call the same `/api/<name>` routes; `inputSchema` mirrors the `lib/` zod schemas. Verify `AI_MOCK`'s `pickToolIntent` already routes your verb.
   *Done when:* reads auto-run, writes require approval, and tool output renders through the existing tool-result seam.

9. **Close the test gate.** Vitest at every seam — pure logic, plus component tests next to components. Docker Playwright e2e for the critical flows (submit→pending, approve/reject, ACL 403 on the wire, the AI tool-approval path), mirroring `e2e/requests.spec.ts`. Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, and the e2e suite. Before the e2e run, ensure the DB carries the new role seeds: `IF NOT EXISTS`/`DO NOTHING` do not update an existing dev DB, so a pre-existing database silently hides the new permissions (recreate or re-seed it, or the permission tests pass against stale data).
   *Done when:* lint, typecheck, unit, and e2e all pass; the feature's critical flows are covered.

10. **Verify the slice.** Re-check every seam against this list: nothing unguarded (ACL on every route), nothing untranslated, nothing untested, the spec's out-of-scope honored, the pure `lib/` checks used by both UI and API. Then run `/code-review` and commit via `/implement`.
    *Done when:* every item above is true and checked, not assumed.
