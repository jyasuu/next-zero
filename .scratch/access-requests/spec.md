# Spec: Access-request workflow page with AI-assisted filing

**Status:** ready-for-agent

## Problem Statement

next-zero is a template for enterprise admin dashboards, but it has no example of a **multi-party workflow**: a form where one user creates a record that must then be decided by someone else. Every existing page is either single-user CRUD (`/users`, `/roles`) or read-only mock data (`/reports`, `/audit-log`). A template adopter evaluating this stack has to invent the "apply → submit → approver decides" pattern themselves — validation, the pending/approved state machine, role-gated approve actions, and how the chat assistant fits into a process — even though the building blocks (zod validation, ACL-guarded routes, the chat tool-approval loop) all already exist here.

We want a page that demonstrates the full pattern in one screen, and that doubles as a reference for how an AI tool participates in a human workflow.

## Solution

A `/requests` page implementing an **access-request workflow**: any authenticated user fills a validated form to request access, the request is created in `pending`, and a user with the `requests:Approve` permission (Admin and Editor roles) decides it — approve, reject, or reopen. The requester can cancel their own pending request. The page also carries a chat scope with two AI tools (`requests_create`, `requests_list`) so the assistant can file a request through the existing human-in-the-loop tool-approval card, or answer questions about the request queue.

The domain is access requests, but the module (`features/requests/`) stays generic so an adopter can relabel the domain (leave, expense, PTO) through i18n and the request fields.

## User Stories

1. As an authenticated user, I want to open an Apply Request page, so that I can file an access request from a dedicated page rather than via email or an offline form.
2. As a requester, I want to fill a form with my name-free details (title, requested access, justification) and have invalid input rejected inline, so that I cannot submit a malformed request.
3. As a requester, I want a successful submission to create a request in `pending` status, so that I can see it immediately in the request list.
4. As a requester, I want to see my own requests in a list with a status badge, so that I can track where each request is in the process.
5. As a requester, I want to cancel a request I submitted that is still pending, so that I can withdraw it if I no longer need the access.
6. As a requester, I want to see the approver's comment and the decision timestamp on a decided request, so that I understand why it was approved or rejected.
7. As an approver, I want to see all requests (including requests filed by other users) on the page, so that I have a single queue to work from.
8. As an approver, I want to approve a pending request, so that the requested access is authorized and the record moves to `approved`.
9. As an approver, I want to reject a pending request with an optional comment, so that the requester learns what was missing.
10. As an approver, I want to reopen a rejected request, so that the requester can address the feedback and the request returns to `pending`.
11. As an approver, I want the decision actions (approve/reject/reopen) to appear only to users granted `requests:Approve`, so that the UI enforces the same boundary as the API.
12. As a viewer/requester without the approve permission, I want decision buttons hidden and direct API calls to approve to fail with 403, so that the ACL is the real security boundary and not just the UI.
13. As an authenticated user, I want the assistant on the requests page to be able to create a request from natural language, so that I can file a request without touching the form.
14. As an authenticated user, I want an assistant-proposed request creation to show the existing approval card before anything executes, so that the AI path has its own human-in-the-loop check.
15. As an authenticated user, I want the assistant to list the visible requests, so that I can ask "what's pending" and get an answer.
16. As an authenticated user, I want to filter the request list by status, so that I can focus on pending or decided items.
17. As a template developer, I want the requests feature to be built from the same module/seam patterns as the rest of the app (feature folder, ACL-guarded routes, zod, i18n, chat scope), so that it is a copyable reference.
18. As a template developer, I want the role seeds to include the new `requests:*` permissions, so that a fresh deployment works without manual role configuration.
19. As an operator, I want request decisions to be idempotent and state-machine-safe, so that a stale double-click or a replayed request cannot double-approve or corrupt a request's state.
20. As an authenticated user, I want the requests page and tools to render localized text, so that the feature matches the rest of the app's i18n story.

## Implementation Decisions

### Feature module

- A `features/requests/` module owns the domain: pure lib (state machine, validation schemas, visibility rules), a page scope contributing chat tools, and the page UI. It follows the `features/notifications/` and `features/users/` layout.

### Data model

- New `requests` table added to `lib/db/index.ts` SCHEMA_STATEMENTS (same Postgres seam as `users`, `roles`, `chat_sessions`):

  ```
  requests(
    id TEXT PRIMARY KEY,
    requester_email TEXT NOT NULL,
    title TEXT NOT NULL,
    access TEXT NOT NULL,
    justification TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    decided_by TEXT,
    decision_comment TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    decided_at TEXT
  )
  ```

  `requester_email` is the owning identity (same convention as `chat_sessions.user_email`). `status` is one of `pending | approved | rejected | cancelled`.

### State machine

- Pure transition logic in `features/requests/lib/` (no DB access), unit-testable at the seam:
  - `create` → `pending` (requester)
  - `approve`: `pending` → `approved` (approver)
  - `reject`: `pending` → `rejected` (approver, optional comment)
  - `cancel`: `pending` → `cancelled` (requester, own request only)
  - `reopen`: `rejected` → `pending` (approver, sends back for revision)
- Any transition not in this table is rejected by the API with a 409, so the state machine is the single source of truth and decisions are idempotent (a repeated approve on an already-approved request is refused, not re-applied).

### Permissions and role seeding

- New permission vocabulary, evaluated by the existing `ability()`/`requireApiAction` machinery:
  - `requests:Read` — view the page and list requests.
  - `requests:Create` — submit a request and cancel one's own pending request.
  - `requests:Approve` — approve, reject, and reopen.
- Seed grants: Admin and Editor gain all three; Viewer gains `requests:Read` + `requests:Create`; Auditor is unchanged.
- The `roles` seed in `lib/db/index.ts` is changed from `ON CONFLICT (id) DO NOTHING` to an upsert of the permission/policy columns, so re-running the schema adds the new `requests:*` actions to existing role rows (fresh Docker DBs seed directly; existing dev DBs converge on re-init).

### API contract (all ACL-guarded with `requireApiAction`)

- `POST /api/requests` — `requests:Create`. Body zod-validated (`title`, `access`, `justification`; non-empty strings). Creates with `status: "pending"`, `requester_email` from the session. Returns the created row (201).
- `GET /api/requests` — `requests:Read`. Caller without `requests:Approve` sees only their own rows; approvers see all rows. Optional `?status=` filter.
- `POST /api/requests/[id]/decision` — `requests:Approve`. Body `{ action: "approve" | "reject" | "reopen", comment?: string }`. Runs the state-machine check; records `decided_by`, `decided_at`, `decision_comment`. Rejects invalid transitions with 409.
- `POST /api/requests/[id]/cancel` — `requests:Create` plus ownership of the row. Only `pending` can be cancelled. (Cancelled is terminal for the requester.)

### Page and UI

- `app/(dashboard)/requests/page.tsx` registered in `lib/constants.ts` `mainNavItems` gated by `requests:Read` (icon + `nav.requests` i18n).
- Page layout: a create form card (title, access, justification with inline zod validation errors) and a status-filterable request list. Status rendered as a badge; decided rows show decision maker, comment, and timestamps.
- Action buttons are permission-driven from the same pure checks the API uses: approvers see Approve/Reject on `pending` and Reopen on `rejected`; the requester sees Cancel on their own `pending`. Non-approvers never see decision controls.
- The page is wrapped in a `RequestsChatScope` (mirrors `users-chat-scope.tsx`), mounting the chat widget with the requests tools.

### AI tools

- Two `ChatTool`s contributed via the page scope:
  - `requests_create` — `approval: "always"`, zod `inputSchema` over `title`/`access`/`justification`; executes `POST /api/requests`. The existing tool-approval card is the AI path's human check.
  - `requests_list` — `approval: "auto"`, executes `GET /api/requests` (visibility rules apply: non-approvers get their own list).
- No mock-model changes needed: `AI_MOCK`'s `pickToolIntent` already routes "create/…" to a tool whose name contains `create` and "list/…" to a `list` tool, and `generateToolArgs` builds args from the zod schema (property-name fixtures).

### i18n

- A `requests` message namespace in both `messages/en.json` and `messages/zh.json` (title, description, form labels/errors, status labels, action labels, empty states), plus `nav.requests`.

## Testing Decisions

- **What makes a good test:** assert external behavior only — what the user can see and what the system permits/denies — not implementation details. The state machine and visibility rules are pure functions tested at their seam; the workflow end-to-end is tested in Docker.
- **Vitest (pure logic).** Prior art: `features/notifications/lib/__tests__/*`, `lib/__tests__/acl.test.ts`. Covered:
  - State-machine transitions: every legal transition, every illegal one (approve on `approved`, reopen on `pending`, cancel on someone else's row), and idempotency.
  - Zod schema validation of the create form (missing/blank fields fail; valid input passes).
  - Visibility rules: non-approver sees own rows only; approver sees all; ownership check for cancel.
  - ACL action checks: `requests:Approve` grants/denies by role.
- **Docker Playwright e2e** (real Postgres, seeded permissions, `AI_MOCK=1`). Prior art: `e2e/pages.spec.ts` (form CRUD), `e2e/chat.spec.ts` (tool-approval loop). Covered:
  - Viewer submits a validated form → the request appears `pending` in the list; Viewer cancels it → `cancelled`; Viewer sees no approve/reject controls.
  - Editor (approver) sees the full queue → approves a `pending` request → `approved`; rejects another → `rejected`; reopens it → `pending`.
  - ACL on the wire: a Viewer POST to `/api/requests/[id]/decision` returns 403.
  - AI path on `/requests`: "create a request" streams a tool-approval card → Approve → `POST /api/requests` → the request shows `pending`; "list requests" auto-executes.
  - Decision buttons act only on `pending`; approving a cancelled/rejected request is refused.
- **Manual smoke test:** real gateway call (`AI_API_KEY`) for a natural-language request, confirming the tool-card → pending flow against a real model.

## Out of Scope

- Email/Slack notification of decisions, escalation, SLA or deadline tracking.
- Approval by per-request assignees; only role-granted approval (`requests:Approve`).
- Multi-step (chain) approvals, re-approval of a resubmitted request, or a `draft` state.
- Attachments, comment threads, or request-template libraries.
- An audit-log integration for decisions (the audit log is mock data); a future hook is plausible but not built here.
- The ability to edit a submitted request (only cancel and resubmit-via-reopen).

## Further Notes

- The workflow intentionally reuses the two approval patterns that already exist in this template: the **workflow approval** (requester submits, approver decides) and the **AI tool approval** (assistant proposes, the current user approves before execution) — so the page is a one-screen reference for both.
- A natural follow-up is wiring decisions into `features/notifications/` (a `requests` category) so a requester gets a browser notification when their request is decided; the notification API already supports per-category preferences.
- The `features/requests/` naming keeps the domain swappable: relabeling to "leave requests" is an i18n + field-label change, not a module rename.
