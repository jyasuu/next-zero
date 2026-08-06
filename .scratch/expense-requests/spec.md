# Spec: Expense-request workflow page with AI-assisted filing

**Status:** ready-for-agent

## Problem Statement

Validation slice for the `business-feature` skill: an expense-request workflow that mirrors the access-request pattern (`features/requests/`) in a different domain, proving the skill produces a conformant slice. A user files an expense request with a validated form; an approver (user with `expenses:Approve`) decides it; the requester can cancel their own pending request. A chat scope lets the assistant file or list expenses through the existing tool-approval loop.

## Solution

A `/expenses` page implementing an **expense-request workflow**: any authenticated user with `expenses:Create` files an expense (title, amount, justification) which lands in `pending`; a user with `expenses:Approve` decides it (approve, reject, reopen); the requester cancels their own pending request. The page carries a chat scope with two AI tools (`expenses_create`, `expenses_list`).

## User Stories

1. As an authenticated user, I want to file an expense request from a validated form, so that a malformed request is rejected inline.
2. As a requester, I want to see my own requests with a status badge, so that I can track them.
3. As a requester, I want to cancel my own pending request, so that I can withdraw it.
4. As an approver, I want to see the full queue and approve/reject/reopen requests, so that I can run the workflow.
5. As a viewer without `expenses:Approve`, I want decision buttons hidden and direct API calls refused with 403, so that the ACL is the security boundary.
6. As an authenticated user, I want the assistant to create an expense from natural language (behind the approval card) and list visible expenses, so that the AI path has a human check.

## Implementation Decisions

### Data model

New `expenses` table in `lib/db/index.ts` `SCHEMA_STATEMENTS`:

```
expenses(
  id TEXT PRIMARY KEY,
  requester_email TEXT NOT NULL,
  title TEXT NOT NULL,
  amount TEXT NOT NULL,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by TEXT,
  decision_comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decided_at TEXT
)
```

`requester_email` is the owning identity (convention: `chat_sessions.user_email`, `requests.requester_email`). `status` is one of `pending | approved | rejected | cancelled`. `amount` is stored as TEXT and validated as `^\d+(\.\d{1,2})?$` (no float columns in the template).

### State machine (pure, in `features/expenses/lib/`)

- `create` → `pending` (requester)
- `approve`: `pending` → `approved` (approver)
- `reject`: `pending` → `rejected` (approver, optional comment)
- `cancel`: `pending` → `cancelled` (requester, own request only)
- `reopen`: `rejected` → `pending` (approver)

Illegal transitions are rejected by the API with 409; decisions are idempotent (a repeated approve on an approved row is refused).

### Permissions and role seeding

- `expenses:Read` — view page and list; `expenses:Create` — file and cancel own pending; `expenses:Approve` — approve/reject/reopen.
- Seed grants: Admin and Editor gain all three; Viewer gains `expenses:Read` + `expenses:Create`; Auditor unchanged. Add the actions to the roles seed `INSERT INTO roles ...` in `lib/db/index.ts` and to `permissionDomains` in `lib/constants.ts`.

### API contract (all ACL-guarded with `requireApiAction`)

- `POST /api/expenses` — `expenses:Create`. Body zod-validated (`title`, `amount`, `justification`). Creates `pending`, `requester_email` from session (201).
- `GET /api/expenses` — `expenses:Read`. Callers without `expenses:Approve` see own rows only; approvers see all. Optional `?status=` filter (400 on unknown status).
- `POST /api/expenses/[id]/decision` — `expenses:Approve`. Body `{ action: "approve" | "reject" | "reopen", comment?: string }`. State-machine checked; 409 on illegal transition.
- `POST /api/expenses/[id]/cancel` — `expenses:Create` + ownership; only `pending`.

### Page and UI

- `app/(dashboard)/expenses/page.tsx` registered in `lib/nav.ts` gated by `expenses:Read`.
- Layout: create form card (title, amount, justification with inline zod errors) and a status-filterable list with badges; decided rows show decision maker/comment/timestamps.
- Action buttons driven by the same pure checks as the API: approvers see Approve/Reject on `pending` and Reopen on `rejected`; requester sees Cancel on their own `pending`.
- Wrapped in `ExpensesChatScope`.

### AI tools

- `expenses_create` — `approval: "always"`, zod `inputSchema` over `title`/`amount`/`justification`; executes `POST /api/expenses`.
- `expenses_list` — `approval: "auto"`, executes `GET /api/expenses`.
- `AI_MOCK`'s `pickToolIntent` already routes "create/…" → `create`, "list/…" → `list`.

### i18n

- An `expenses` namespace in both `messages/en.json` and `messages/zh.json`, plus `nav.expenses`.

## Testing Decisions

- **Vitest (pure logic):** state-machine transitions (every legal and illegal one), zod create-schema validation (including amount pattern), visibility rules (own rows vs all rows, ownership for cancel).
- **Docker e2e (critical flows):** viewer files → `pending` → cancels; approver approves/rejects/reopens; viewer POST to decision returns 403. Modeled on `e2e/requests.spec.ts`. (Run via the compose stack; the AI tool-approval path is covered by `requests.spec.ts` already, so the expense e2e keeps to the human workflow.)

## Out of Scope

- Attachments, receipt images, reimbursement/remittance, editing a submitted request, chain approvals, notifications integration.
