# Spec: AI form-fill tool that validates against page form state

**Status:** resolved (shipped; extended post-review with apply-to-form + auto-apply, see "Apply to form" below)

## Problem Statement

The chat assistant can act on a page's domain through tools that call ACL-guarded APIs (`requests_create`, `expenses_create`), but it has no way to interact with the page's *elements* — the forms themselves. A user who wants to pre-check the data they're about to enter ("does this amount validate?", "what do I still need to fill in?") has to either submit the form and read the inline errors, or guess. We want the assistant to be able to "access a page element" — here, the page's form, modeled as its component state/definition (the zod schema and field labels), not the HTML DOM — fill it with proposed values, and return the validation result without submitting anything.

This mirrors the existing principle that tools already operate on application state rather than the DOM: `account_whoami` reads `useChatStore` client-side, and domain tools call data seams. The form tool extends the same idea to a page's form.

## Solution

A generic, side-effect-free **form-fill chat tool** that a page registers on its chat scope alongside its domain tools. The tool is built from the page's *existing* zod form schema, so its validation verdict is identical to the form's inline validation. When the assistant fills the form with proposed values, the tool returns a structured validation result: `{ valid, values, errors }` — whether the data passes, the filled values, and per-field error messages. It never submits or mutates anything, so it is `approval: "auto"` and needs no API route or new permission.

Wire it to both form pages — `/expenses` and `/requests` — to prove the seam generalizes.

## User Stories

1. As an authenticated user on a form page, I want the assistant to fill the page's form with proposed values and tell me whether the data validates, so that I can pre-check a submission before sending it.
2. As an authenticated user, I want the validation result to say exactly which fields failed and why, so that I can fix the data.
3. As an authenticated user, I want the assistant's validation verdict to match the form's inline validation for the same data, so that I never get contradictory guidance.
4. As an authenticated user, I want the form tool to never submit the form or change anything, so that checking my data is completely safe.
5. As an authenticated user, I want the form tool to run automatically without an approval prompt, so that checking data is frictionless.
6. As a user without write permission (e.g. a Viewer on `/expenses`), I want the form tool still available, so that I can pre-validate data even when I cannot act on the domain.
7. As a chat user, I want a partial fill to report which fields are still missing, so that I can see what is incomplete.
8. As a chat user, I want the validation result rendered as a clear verdict (valid/invalid) with per-field values and errors, so that I can read it at a glance.
9. As a template developer, I want to add a form-fill tool to my page with one factory call using my existing form schema, so that form pre-validation needs no backend, schema, or permission work.
10. As a template developer, I want the form-fill tool to follow the existing `ChatTool` contract (`id`, `name`, `description`, `inputSchema`, `approval`, `execute`), so that approval, rendering, session persistence, and mock routing work unchanged.
11. As a template developer, I want the form tool's `inputSchema` and output shape to serialize and render like any other tool, so that history restores correctly after a reload.
12. As a maintainer, I want the `AI_MOCK` stub to route "fill / validate / check / form" prompts to the page's form tool, so that the feature is deterministically e2e-testable without an LLM key.
13. As a maintainer, I want unit tests at the factory seam covering valid, invalid, partial, and unknown-field fills, so that the verdict logic is pinned.
14. As a template developer, I want the feature wired on both `/expenses` and `/requests`, so that the seam is proven to generalize across domains.
15. As an authenticated user, I want the assistant to describe the fields I can fill (name, format, e.g. amount as a decimal), so that I know what to provide.

## Implementation Decisions

### Form-fill tool factory (new module, `features/chat/tools/form-fill.ts`)

A factory that turns a page's form schema into a `ChatTool`:

```
createFormFillTool({ id, name, description, schema }) → ChatTool
```

- `id` follows the `_form_fill` suffix convention (`expenses_form_fill`, `requests_form_fill`); `name` is the human label shown on the tool card.
- The tool's `inputSchema` is a zod object with **one required string per field** of the form schema. Fields are required so the mock model's `generateToolArgs` (which fills only `required` props) generates a complete fill — see Testing Decisions.
- `approval: "auto"` — the tool is pure (no network, no mutation), so no approval card.
- `execute(args)` runs `schema.safeParse(args)` — the *same* zod form schema the page's panel uses for inline validation (`expenseFormSchema`, `requestFormSchema`) — and always returns `ok: true` with the verdict; an invalid fill is a result, not a failure:

```
{ ok: true, data: { valid: boolean, values: Record<string, string>, errors: Record<string, string> } }
```

- `errors` is the first flattened field-error message per failing field (the same `parsed.error.flatten().fieldErrors` the panel reads), so chat and page agree message-for-message. `values` echoes the provided values.
- The `description` enumerates the fillable fields and their formats (e.g. "amount as a decimal like 42.50") so the model maps natural language to fields.

### Form schema (existing data seam, unchanged)

No new schema. The factory is given the page's existing `expenseFormSchema` / `requestFormSchema`. The single source of truth for field rules stays in `features/<domain>/lib/form.ts`.

### Mock model routing (existing chat seam, small change)

- `intentOf` in `features/chat/server/mock-model.ts` gains a `fill` intent for `/fill|validate|check|form|draft/`.
- `pickToolIntent` routes `fill` intents to the tool whose `id` or `name` contains `form` (the page's form-fill tool). No change to `generateToolArgs`: the tool's all-required `inputSchema` means the stub generates one `mock-*` value per field.
- No `ChatTool`, `SerializedChatTool`, or serialization changes — the JSON-schema round-trip already carries the tool.

### Tool result rendering (existing renderer seam, small change)

- Add `formFillOutputSchema` to `features/chat/types.ts` (`valid`, `values`, `errors` records) and extend the `KnownToolOutput` union / `ToolId` with the two new ids.
- Add a `FormFillView` renderer to `features/chat/components/tool-result.tsx` keyed by `expenses_form_fill` and `requests_form_fill`: a valid/invalid badge plus a per-field list of values and their errors. Unknown form-fill ids fall back to the existing `GenericView` (key-value grid), so a future page gets a decent render with zero extra work.
- i18n: new `chat` namespace keys (en/zh) for the verdict labels ("Valid", "Invalid", "No field errors") alongside the existing tool-card strings.

### Apply to form (post-review extension, user-requested)

The base tool is side-effect-free and never touches the DOM. To make the verdict actionable, the user asked for a recommended **"Apply to form"** button on the verdict card plus a persisted **auto-apply** preference:

- New shared seam `stores/form-fill-store.ts` (zustand, `persist`): a client-side registry of apply handlers keyed by tool id, `applyFormFill(toolId, values)`, `hasApplyHandler(toolId)`, `hasAnyApplyHandler`, and a persisted `autoApplyWhenValid` boolean (`partialize` keeps only the preference in `localStorage`; handlers are transient).
- `FormFillView` renders an "Apply to form" button when an apply handler is registered for its tool id and the output carries values. Clicking calls `applyFormFill(toolId, values)` and always applies.
- When `autoApplyWhenValid` is enabled, a valid verdict applies its values automatically at **tool-execution time** (`chat-panel.executeTool` → `autoApplyFormFillResult`), not on render. The auto-apply path calls `applyFormFill(toolId, values, { onlyIfEmpty: true })`, so it never clobbers fields the user has already filled. Because it runs only when a fill tool actually executes, enabling auto-apply after the fact never retroactively fills the form from an already-displayed or restored-history verdict — only fills produced while the toggle is on take effect.
- Each form panel registers an apply handler on mount via the shared `useRegisterFormFillApply(toolId, form, setForm, setFormErrors)` hook (which also encapsulates the `onlyIfEmpty` check and unregisters on unmount), and unregisters on unmount. The page form remains the sole owner of its field state; the seam only forwards proposed values.
- The chat widget header shows a compact auto-apply `Switch` whenever any apply handler is registered (i.e. on form pages), so the preference is discoverable before the first fill.
- i18n: `chat.formFill.apply` ("Apply to form" / "应用到表单") and `chat.formFill.autoApply` ("Auto-apply" / "自动应用").

### Page registration (thin, follows the `business-feature` skill)

- `features/expenses/tools.ts`: add `expenses_form_fill` built from `expenseFormSchema`.
- `features/requests/tools.ts`: add `requests_form_fill` built from `requestFormSchema`.
- The existing `ExpensesChatScope` / `RequestsChatScope` wrappers already register their `tools` arrays, so no scope or page component changes are needed.

### Explicitly not done

- No DB table, no API route, no `requireApiAction` permission, no `lib/constants.ts` or `lib/nav.ts` change, no `permissionDomains` entry. The tool is page-scoped (reachable only by chatting on a page you can access) and side-effect-free.

## Testing Decisions

- **What makes a good test:** assert external behavior — the validation verdict and field errors a user actually sees, and which tool the stub routes to — not implementation details. Pure logic is unit-tested at the factory seam; the user-visible loop is e2e-tested through `AI_MOCK`.
- **Vitest — factory (new `features/chat/tools/__tests__/form-fill.test.ts`):** valid fill → `valid: true` with echoed values; invalid fill → `valid: false` with field-keyed errors; partial fill → missing-field errors; unknown/extra fields rejected; `approval` is `"auto"`; `execute` never calls the network. Prior art: `features/expenses/lib/__tests__/form.test.ts`, `features/chat/lib/__tests__/approval.test.ts`.
- **Vitest — mock routing (extend `features/chat/server/__tests__/mock-model.test.ts`):** "fill the expense form…" routes to `expenses_form_fill`; "validate this request…" routes to `requests_form_fill`; questions with no fill/create intent still return null / fall back. Prior art: existing `pickToolIntent` cases in that file.
- **Vitest — renderer (extend `features/chat/components/__tests__/tool-result.test.tsx`):** a form-fill output renders the verdict badge and per-field errors. Prior art: existing tool-result component tests.
- **Docker Playwright e2e with `AI_MOCK=1` (extend or add `e2e/form-fill.spec.ts`):** the stub generates one `mock-*` value per field, which makes the two pages deterministically cover both branches:
  - On `/requests` (free-text schema), the generated fill is *valid* → assert the verdict badge and the filled values render.
  - On `/expenses` (amount regex), the generated `mock-amount` is *invalid* → assert the invalid verdict and the amount error render.
  - Assert the tool executes without an approval card (auto policy).
  - Prior art: `e2e/chat.spec.ts`, `e2e/expenses.spec.ts`, `e2e/requests.spec.ts`. Note: six `chat.spec.ts` scenarios currently fail in this environment with changes stashed — pre-existing, not caused by this feature.

## Out of Scope

- Submitting the form or persisting anything — the tool validates proposed data only.
- Reading the form's current live state (what the user has already typed in the panel); only proposed fill data is validated.
- Live DOM access — the seam forwards proposed values to page form state (`setForm`), never writes to rendered HTML inputs directly; "page element" means the form's component-state definition, not the DOM.
- Other page-element types (buttons, tables, selects, filters) — form fill is the first page-element capability.
- Approval-policy overrides; the form tool is `auto` because it is pure.

## Further Notes

- The `ChatTool` contract is the template's extension point; this feature stays entirely inside it — one factory, one routing regex, one renderer, two registrations. That is the whole diff surface.
- The all-required `inputSchema` is deliberate: it makes the stub produce a full fill, which is what makes both e2e branches (valid on `/requests`, invalid on `/expenses`) deterministic without network or fixture plumbing.
- If a future tool needs to read live form state, it should be `approval: "always"` and likely needs a shared form-state seam (like `useChatStore`); reading is still deferred. Writing proposed values is already covered by the `form-fill-store` apply seam added post-review.
