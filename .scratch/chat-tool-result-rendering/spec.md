# Spec: Chat tool call presentation for normal users

**Status:** ready-for-agent

## Problem Statement

When the assistant invokes a tool in chat, the user sees a tool card. Today that card shows the tool's **input arguments as raw JSON** in a `<pre>` block (`{ "id": "abc-123" }`), and — until recently — tool outputs were also shown as raw response text. The output side now has basic per-tool renderers, but they are keyed by untyped string id, take `unknown` output, and rely on runtime shape guesses (`unwrapData`, generic fallbacks). There is no guarantee that a new builtin tool ships with presentation: a tool added without a renderer silently falls back to a generic view that can still expose raw data.

For a **normal user** (as opposed to a developer or an admin auditing an approval), raw JSON is confusing and leaks the internal data model. The chat surface should render every tool call as product-grade UI — human-formatted arguments, structured results (tables, cards, badges), with raw data never shown by default and only available behind a deliberate toggle.

## Solution

Every tool call in chat renders as a friendly card:

- **Arguments** render as human-formatted fields (or plain text for scalar args), never raw JSON. Tools with no parameters show no argument section at all. The raw JSON remains available behind a collapsible toggle so an admin reviewing an approval can audit the exact payload.
- **Results** render via a typed, per-tool component: identity as a profile card, lists as a table with status badges, single records as a labeled detail card, deletions as a confirmation. Outputs that don't match the tool's known shape (older persisted sessions, dynamic tools) fall back to a safe generic view — they never crash the card and never dump raw JSON by default.
- **Strictness is enforced by TypeScript and tests**, not a template language: each builtin tool declares its output type once, shared by the tool's implementation and its renderer, and adding a tool without a renderer is a compile-time error plus a failing test.

## User Stories

1. As a normal user, I want tool results to render as readable UI (tables, cards, badges) rather than raw JSON, so that I can understand what the assistant did.
2. As a normal user, I want to never see raw JSON in my chat by default, so that the interface feels product-grade rather than technical.
3. As a normal user, I want a tool with no parameters to show no argument section, so that cards stay clean.
4. As a normal user, I want a tool's arguments to render as human-formatted fields rather than JSON, so that I understand what ran.
5. As a normal user, I want a single plain-text argument shown as plain text, so that simple inputs aren't over-wrapped in structured UI.
6. As an admin reviewing an approval card, I want the full raw arguments available behind a collapsible "details" toggle, so that I can audit the exact payload before approving.
7. As a normal user, I want the identity tool to show my access as a profile card (avatar initials, email, role, admin/member badge), so that I see my own access at a glance.
8. As a normal user, I want list outputs to render as a table with status badges, so that scanning many results is easy.
9. As a normal user, I want single-record outputs to render as a labeled detail card, so that fields are readable.
10. As a normal user, I want a delete operation to render a confirmation, so that outcomes read naturally instead of as `{ "success": true }`.
11. As a user resuming an older session, I want tool results that predate the typed renderers to still render via the generic view rather than crash or show raw JSON, so that history stays readable.
12. As a developer adding a new builtin tool, I want the compiler and the test suite to force me to declare the tool's output type and a renderer, so that no tool can ship without presentation.
13. As a developer, I want the shared output types to live in one place, imported by both the tool's implementation and its renderer, so that they cannot drift apart.
14. As a developer, I want outputs that fail validation against the known shape to fall back safely, so that the card is resilient to unexpected persisted data.
15. As a developer, I want a registry-completeness test, so that adding a tool id without a renderer fails CI.

## Implementation Decisions

### No template engine

A Jinja-style string template engine (and its JS ports, e.g. Nunjucks) was explicitly rejected after grilling: the output surface is a React tree, and string-template output would force `dangerouslySetInnerHTML` (an XSS seam) or a string→component parse. Strictness comes from TypeScript types, not a template language. No new templating dependency is added.

### Typed output contracts (shared, single source of truth)

- The chat feature's shared types module owns the output shapes for the builtin tools: a `UserRow` type (id, name, email, role, status, created_at) and the identity output shape (email, role, isAdmin).
- A discriminated union keys the known outputs to tool ids, e.g. `account_whoami` → identity, `users_list` → `UserRow[]`, `users_get`/`users_create`/`users_update` → `UserRow`, `users_delete` → `{ success: true }`.
- Both the tool implementations (their `execute` return values) and the renderer registry import these from the same module, so they cannot drift.
- Adding a new builtin tool requires adding its output shape to the union; a renderer that does not cover it fails to typecheck.

### Typed, exhaustive renderer registry

- The renderer registry maps a tool id to a React component. It is exhaustive over the known tool ids: a tool id without an entry is a compile-time error.
- Each renderer receives the **persisted** output as `unknown` (never trusted), validates it against a small zod schema for that tool's shape, and renders the rich view (profile card, table, detail card, confirmation) on success.
- On validation mismatch — old persisted envelopes such as `{ ok: true, data: [...] }`, or output from a dynamic/non-builtin tool — the renderer delegates to the existing generic view (auto-table for arrays of objects, labeled key/value grid for objects, text for scalars, empty state for empty arrays). It never throws and never shows raw JSON by default.
- Per-tool presentation for the builtin tools: identity → profile card with avatar initials, email, role badge, administrator/member badge; `users_list` → table of name/email/role/status with status as colored badges; `users_get`/`users_create`/`users_update` → detail card with labeled fields; `users_delete` → confirmation message.

### Generic input (request) renderer

- One shared component renders tool arguments for **all** tools; arguments are schema-validated key/value data with no per-tool semantics, so no per-tool input components are needed.
- Empty or absent arguments → no argument section is rendered.
- A single plain-text scalar argument → rendered as plain text.
- Structured arguments (object/array) → rendered as a key/value grid or list.
- The raw JSON of the arguments is always available behind a collapsible toggle (using a lightweight expand/collapse — no new UI dependency), which also serves as the audit view on approval cards where the admin must see the exact payload before approving.

### Presentation policy

- Raw JSON (inputs or outputs) is **never shown by default** to a normal user; the collapsed detail toggle is the only escape hatch and is primarily for approval review.
- The current label mapping (snake_case/camelCase keys → human labels) and the generic fallback views are retained and shared by the input and output renderers.

### Module boundaries

- Renderers and the input renderer live in the client chat UI components; they are the only place tool data is turned into markup. The tool definitions remain free of React so they can be serialized and shipped without dragging a component bundle into server code.

## Testing Decisions

- **What makes a good test:** assert external behavior only — what the user sees on the tool card — not implementation details like which internal helpers were called.
- **Primary seam (React component tests):** extend the existing `tool-result` component tests (prior art: `markdown.test.tsx` and the current `tool-result.test.tsx`). Cover:
  - Identity output renders a profile card (email, role, admin/member badge) and no raw JSON.
  - User lists render a table with status badges; empty lists render an empty state.
  - Single-record outputs render a detail card with labeled fields.
  - Delete output renders a confirmation.
  - Tools with no arguments render no argument section.
  - Structured arguments render as fields, plain-text scalar arguments render as text, and the raw JSON is behind a collapsible toggle.
  - Legacy/mismatched output (e.g. `{ ok: true, data: [...] }`, unknown tool id) falls back to the generic view without crashing and without showing raw JSON.
- **Secondary seam (pure unit test):** a registry-completeness test asserts that every registered tool id has an output renderer, mirroring the compile-time exhaustive union (prior art: existing `features/chat/lib/__tests__/`).
- **Not covered by e2e:** the Playwright `AI_MOCK` seam already covers the approval/execution loop; presentation is verified deterministically at the component seam instead.

## Out of Scope

- Any template engine or DSL for tool presentation (explicitly rejected in grilling).
- Model-facing formatting: structuring or constraining the assistant's final prose answer, or feeding presentation templates to the model. This spec is UI-only.
- Changing the tool contract (`id`, `name`, `description`, `inputSchema`, `approval`, `execute`) or the model-facing serialization of tools.
- Support for third-party/dynamic tools beyond the safe generic fallback.
- Per-locale localization of field labels beyond the current label mapping.
- Server-side rendering of tool results into HTML or markdown.

## Further Notes

- The output renderers, generic fallbacks, label mapping, and empty states already shipped in the initial work; this spec formalizes the typed shared contracts, the exhaustive/validated renderer registry, and the generic input renderer that replaces the raw JSON arguments block.
- Sessions persisted before this work store tool outputs in legacy envelopes; the defensive validation in each renderer exists specifically so that history remains readable.
