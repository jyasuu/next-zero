# Spec: Chat copilot framework with human-in-the-loop tool approval

**Status:** ready-for-agent

## Problem Statement

next-zero is intended to be a template for enterprise admin dashboards, but it ships with no assistant experience. There is no way for a user to ask questions about the workspace or perform actions ("create a user with Editor role", "what does the Viewer role allow?") in natural language. The todo-manager reference project proves a chat + declarative-tool architecture, but its tools execute with no permission model, no approval, and no persistence — none of which is acceptable for a multi-user admin product that already has a real ACL (`ability()`, `requireApiAction`) and a server-side data layer.

We want a **chat framework** as a first-class template feature: page-scoped and global tools that are trivial for a new page to integrate, an approve-before-execute loop so the model proposes but the user disposes, sessions persisted server-side with soft delete, and enforcement that the assistant can never exceed the calling user's permissions.

## Solution

A chat framework built into the dashboard:

- **Assistant everywhere.** A floating chat widget is available on every dashboard page, plus a dedicated `/chat` page. They share one chat panel component and one session layer. The widget carries the current page's tools; the `/chat` page carries only global tools.
- **A one-file tool contract.** A tool is `ChatTool { id, name, description, inputSchema, approval, execute }`. Global tools are registered once; a page contributes tools by wrapping itself in a scope (e.g. `<ChatToolScope tools={...}/>`). No server changes are needed to add a tool — the active tool definitions ride with the chat request.
- **Human-in-the-loop execution.** The model streams a proposed tool call; the UI renders an approval card (tool, arguments, Approve/Deny). On approval the client runs `execute`, which calls the existing ACL-guarded routes, so the tool's real effect is still enforced server-side per the caller's permissions. Per-tool policy (`always` vs `auto`) decides whether the card appears or the call executes immediately; write tools default to `always`.
- **Server-side sessions.** Conversations persist in the sql.js DB: `chat_sessions` with a `deleted_at` soft-delete column and `chat_messages` storing the streamed message parts. Sessions are global (shared across pages), listed in the chat UI, and deletable (soft).
- **Informed, constrained assistant.** Every request injects a system prompt with the caller's identity, role, and granted permissions, the active tool definitions, and the user's own custom prompt (editable on Profile). The assistant knows what the user may do, and the routes enforce that it cannot do more.

## User Stories

1. As an authenticated user, I want a chat assistant available on every dashboard page, so that I can ask questions or give instructions without leaving my current page.
2. As an authenticated user, I want a dedicated `/chat` page, so that I have a full-screen conversation view when I want to focus on a longer task.
3. As an authenticated user, I want the chat widget on a page to know that page's tools, so that I can act on the exact domain I am looking at.
4. As an authenticated user, I want the `/chat` page to expose only global tools, so that the page's behavior is predictable and not tied to whichever page I last visited.
5. As a template developer, I want to add a tool by writing one small object and wrapping my page in a scope, so that tool integration requires no backend or routing changes.
6. As a template developer, I want to register global tools once, so that every page's chat can offer them.
7. As an authenticated user, I want the assistant to propose a tool call with its arguments before anything executes, so that I can review and approve the exact action.
8. As an authenticated user, I want to be able to deny a proposed tool call, so that I retain control over what happens in my workspace.
9. As a tool author, I want to declare per-tool approval policy (`always` vs `auto`), so that destructive/write operations require confirmation while reads run immediately.
10. As a Viewer, I want the assistant's tools to fail with a clear refusal when they exceed my grants, so that even an approved action cannot bypass the ACL.
11. As an Admin, I want the assistant to perform the same write operations I can perform, so that I can delegate mundane CRUD work to it.
12. As an authenticated user, I want my conversations persisted server-side, so that I can leave and come back to the same conversation later or on another device.
13. As an authenticated user, I want to create multiple conversations (sessions), so that I can organize work by topic.
14. As an authenticated user, I want to list my past sessions and resume one, so that I do not lose context between visits.
15. As an authenticated user, I want to delete a session and have it disappear from my list, so that I can clean up finished work.
16. As a developer, I want session deletion to be a soft delete, so that data is recoverable and the pattern matches an enterprise template.
17. As an authenticated user, I want my sessions to be private to me, so that no other user can read or modify them.
18. As an authenticated user, I want a conversation to restore with its tool-call cards and approvals intact, so that the history reads the same after a reload.
19. As an authenticated user, I want the assistant's text answers rendered as markdown, so that code, lists, and tables are readable.
20. As an authenticated user, I want to copy an assistant message, so that I can share or paste its content.
21. As an authenticated user, I want the assistant to know my identity, role, and permissions, so that it acts within and explains my limits.
22. As an authenticated user, I want to set my own custom prompt, so that I can steer the assistant's behavior (tone, language, constraints).
23. As an authenticated user, I want my custom prompt to apply to every conversation, so that my preferences are consistent.
24. As an operator, I want the chat feature to be configurable via env vars and gracefully disabled when unconfigured, so that the template deploys cleanly without an LLM key.
25. As a developer, I want the assistant to use an OpenAI-compatible model behind a configurable base URL, so that template adopters can plug in their own provider.
26. As a developer, I want the chat feature gated only by authentication, so that no new permission vocabulary is needed; per-tool ACL remains the security boundary.

## Implementation Decisions

### Chat framework module

- A `features/chat/` module owns the assistant: types, the global provider (session list, active session, messages, send), the tool-scope mechanism, the chat panel, the floating widget, and the `/chat` page content. The dashboard layout mounts the provider + widget; the `/chat` page and the widget render the same panel.

### Tool contract and registration

- `ChatTool` is `{ id, name, description, inputSchema, approval: "always" | "auto", execute }`. `id` is a stable string used for dedupe and rendering; `name` is the human label shown on the approval card; `inputSchema` is a Zod schema validated before `execute`; `execute` returns `{ ok, data?, error? }` and runs against the existing ACL-guarded routes.
- Global tools are a plain array registered once (e.g. an identity/access tool). Page tools are contributed by a client-side scope wrapper around the page's content; the scope registers with the active session and is torn down on unmount.
- The client sends the active tool definitions (id/name/description/schema), the `sessionId`, and the message history to the chat API with each request. Because execution is client-side and the real routes enforce ACL, client-supplied tool definitions are safe.

### Execution and approval loop

- The chat API streams with the AI SDK (`ai` v7, `@ai-sdk/react`, `@ai-sdk/openai`); zod is already a dependency. The model emits a tool-call part instead of executing (no server-side `execute`).
- The client renders each tool call as an approval card. `approval: "always"` shows Approve/Deny; `auto` executes immediately. A deny discards the call and tells the model it was rejected. An approve runs `execute`, then appends the result back into the conversation and asks the model to continue, so one logical turn may span several round-trips.
- A 403 (or error) from a guarded route surfaces as a refusal the assistant reflects back to the user.

### Chat API

- `POST /api/chat` is guarded by authentication only (no `requiredAction`). The request carries `sessionId`, history, and active tool definitions. The server injects a system prompt with the caller's email, resolved role, granted permission set, active tool descriptions, and the caller's custom prompt, then streams the AI SDK UI-message response.
- Model factory reads `AI_ENABLED`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (defaults: opencode gateway, model `big-pickle`). When disabled/unconfigured the UI shows a "Chat disabled — configure AI" state instead of the composer. `AI_MOCK=1` returns a deterministic stub model (canned tool-call flow) for e2e.

### Sessions and persistence (server-side, sql.js)

- New tables:
  - `chat_sessions(id, user_email, title, created_at, updated_at, deleted_at)` — `deleted_at` is the soft delete; list queries filter `deleted_at IS NULL` and sort by `updated_at`; `title` is auto-seeded from the first user message.
  - `chat_messages(id, session_id, role, parts_json, created_at)` — `role` is `user`/`assistant`; `parts_json` stores the AI SDK UI-message parts so tool cards and approvals re-render after reload.
- Endpoints, all ownership-checked against the session's `user_email`:
  - `GET /api/chat/sessions` — list the caller's active sessions.
  - `POST /api/chat/sessions` — create (returns the id).
  - `DELETE /api/chat/sessions/[id]` — soft delete (sets `deleted_at`).
  - `POST /api/chat/sessions/[id]/messages` — persist one completed turn.
- Messages persist per completed round-trip, so an approved execution is one stored turn and a refresh restores the conversation as-is.

### Custom prompt

- New table `user_settings(user_email, custom_prompt)`; edited on the Profile page via an auth-guarded `PUT /api/settings` (identity = row owner). Injected into the system prompt of every chat request.

### UI and rendering

- Assistant text renders with `react-markdown` (no `rehype-raw` — raw HTML is not allowed), theme-consistent code styling, and a copy button. Tool calls render as their own card part, not markdown.
- i18n: a `nav.chat` entry (the nav item has no `requiredAction`, like Dashboard/Profile) and a `chat` message namespace in both locales.

## Testing Decisions

- **What makes a good test:** assert external behavior only — what the user sees and what the system permits/denies — not implementation details. Pure decision logic is unit-tested at the seam of its pure functions; the user-visible approval loop is tested end-to-end.
- **Vitest (pure logic).** Prior art: `lib/__tests__/acl.test.ts`, `role-mapping.test.ts`, `admin-login.test.ts`. Covered:
  - Tool registration and page-scope resolution (scope mounts/tears down; global vs page tool merge; active tool set per request).
  - Approval policy evaluation (`always` vs `auto`) and the validate-before-execute guard.
  - System-prompt assembly: identity + role + permissions + custom prompt + tool descriptions.
  - Session soft-delete filtering (active list excludes `deleted_at`-set rows) and ownership checks.
  - Message `parts_json` mapping (parts survive serialize/deserialize).
- **Docker Playwright e2e with `AI_MOCK=1`.** Prior art: `e2e/admin.spec.ts`, `e2e/pages.spec.ts`. The app container runs with the stub model so the full loop is deterministic without network. Covered:
  - Send a message → tool-call approval card renders → Approve → real guarded route executes → assistant confirms; and the Deny path.
  - Write tools require approval (card appears); read tools auto-execute.
  - A Viewer-approved write produces a 403 and a refusal message.
  - Sessions: create, list, resume, soft-delete (disappears from list).
  - Widget on a page surfaces that page's tools; `/chat` page surfaces only global tools.
  - Disabled state renders when `AI_ENABLED` is false / no key.
- **Manual smoke test:** real gateway call with `AI_API_KEY` set (network-dependent; not part of CI).

## Out of Scope

- Todo/task tool sets and assistant planning (`todowrite`/`task`-style) — explicitly deferred.
- End-user toggling of per-tool approval policy at runtime; the policy is author-defined per tool for now.
- Sharing or transferring sessions between users; export/import of conversations.
- Voice input, file attachments, image understanding, model-switcher UI.
- Rate limiting and token/budget controls.
- Chat audit logging (a future hook is plausible but not built here).

## Further Notes

- Sessions and messages live in the sql.js DB, which is ephemeral per-Vercel-Lambda and file-backed in Docker — the same durability profile as the existing users/roles data. Template adopters replacing the DB get persistence for free via the same seam.
- The tool contract is the template's extension point: a page author adds value by writing a `ChatTool` and wrapping their page in a scope. The `/chat` page intentionally shows only global tools so its behavior is not page-dependent.
- `AI_MOCK` keeps the full approval loop testable in CI without an LLM key; the stub is swapped at the single model-factory seam.
