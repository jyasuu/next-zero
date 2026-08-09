# Spec: User-authored skills for the chat copilot

**Status:** ready-for-agent

## Problem Statement

The chat copilot knows how to use tools, but it has no sanctioned way to follow a reusable, documented workflow — a multi-step procedure like "submit an expense with justification", "review a user request", or "export and reconcile a report". Today every such procedure must be re-explained to the assistant mid-conversation, or encoded as an unstructured custom prompt that the user cannot version, share, or switch on and off per task. The assistant is equally blind to what procedures exist: it never sees an inventory of the workflows it can follow, so it cannot offer to run one.

We want the copilot to behave the way opencode's agent does with skills: the assistant is shown an inventory of the caller's available skills (name + description), can propose one that fits the user's request, asks the user to approve loading it, and then receives the skill's full contents so it can execute the workflow using the tools it already has — no new execution machinery.

## Solution

A skill is a user-authored document `{ name, description, content }` stored in the database and owned by its author. Each user manages their own skill library through a Skills page (list, create, edit, delete). The chat copilot advertises the caller's skills in the system prompt; when the model decides a skill fits, it calls a global `skill` tool, the user approves the load (mirroring opencode's permission gate), and the skill's full content is fetched from an ownership-scoped API and injected into the model as an opencode-style `<skill_content>` block. The model then follows the workflow using existing tools, all still under the caller's ACL grants and per-tool approval policy.

## User Stories

1. As an authenticated user, I want to create a skill with a name, description, and content body, so that I can package a repeatable workflow for the assistant.
2. As an authenticated user, I want my skills listed on a dedicated page, so that I can see what workflows I have authored.
3. As an authenticated user, I want to edit a skill's name, description, or content, so that I can keep it accurate as my workflows change.
4. As an authenticated user, I want to delete a skill, so that obsolete workflows stop being advertised to the assistant.
5. As an authenticated user, I want my skill library to be private to me, so that other users cannot read or reuse my workflows.
6. As an authenticated user, I want to be told when a skill name is already taken, so that I do not create ambiguous duplicates.
7. As an authenticated user, I want clear validation for a skill's name, description, and content, so that I cannot publish a broken or empty skill.
8. As an authenticated user, I want the assistant to see the inventory of my skills, so that it knows which workflows it can offer to run.
9. As an authenticated user, I want the assistant to recognize when a skill fits my request and propose loading it, so that the workflow is applied without me having to paste its instructions.
10. As an authenticated user, I want to approve or deny a proposed skill load, so that no new instructions enter the conversation without my consent.
11. As an authenticated user, I want the skill's full contents fed back to the assistant once I approve, so that it can follow the workflow faithfully.
12. As an authenticated user, I want the loaded skill to show as a card in the chat history, so that I can see which skill was applied and when.
13. As an authenticated user, I want the assistant to continue the conversation with the skill's steps in mind, using its existing tools, so that the workflow actually executes.
14. As an authenticated user, I want a skill's workflow to still respect the caller's permissions and per-tool approvals, so that a skill can never escalate access.
15. As an authenticated user, I want my skills to be available on every page and on the chat page, so that I can start a workflow wherever the copilot is.
16. As a developer, I want skills to live in a database owned per user, so that they persist and are never readable cross-tenant.
17. As a developer, I want the `skill` tool to ride the same execute → tool output → auto-send loop as every other tool, so that no new streaming or transport machinery is introduced.
18. As a developer, I want the `skill` tool added to the typed output union and the renderer registry, so that the existing completeness checks keep CI green.
19. As a developer, I want the skill advertisement and the model-facing content block to come from a pure, unit-testable module, so that edge cases are pinned down cheaply.
20. As a developer, I want the mock model to be able to emit a `skill` call, so that the full loop stays testable end to end.

## Implementation Decisions

### Skills data seam

- A new `skills` table: `id` (text PK), `user_email` (not null), `name` (not null), `description` (not null), `content` (not null, markdown body), `created_at` (text), `updated_at` (text). Add a unique index on `(user_email, name)` so names are unique per author.
- Skills are per-user and ownership-scoped, exactly like chat sessions. There is no shared/org skill store and no cross-tenant read path in this iteration.

### Skill validation and shape

- A skill record is `{ id, name, description, content }` plus timestamps. `name` is a short slug-like identifier (letters, digits, dashes/underscores, max ~50 chars) so it can be referenced by the `skill` tool; `description` is a one-line summary (max ~200 chars) used in the advertisement; `content` is the full markdown workflow body.
- Validation runs in a pure module and rejects empty or malformed names, missing descriptions, and empty content, and surfaces a per-field message.

### The `skill` global tool

- A new global `ChatTool` with id `skill`, name "Load a skill", `approval: "always"`, and a zod input schema `{ name: z.string() }` referencing a skill name from the advertised inventory.
- Because it is registered in the global tool set, it appears in the active tool definitions sent with every chat request and is available on every page and on the `/chat` page, consistent with the copilot spec's global-tool rule.

### Advertisement in the system prompt

- The chat route loads the caller's skills and passes `{ name, description }[]` into the system-prompt builder. The builder adds an `Available skills:` section (one `- <name>: <description>` line per skill, opencode-style) so the model can offer the right workflow. The section is omitted when the caller has no skills.

### Loading a skill (execution)

- The `skill` tool's `execute` is client-side like every other tool. It validates its arguments, then fetches the caller's skill by name from an ownership-scoped API endpoint.
- The API endpoint guards with the same authentication + ownership checks as the sessions API (`requireSession` plus `user_email` matching), so a user can only ever load their own skill.
- On success the tool returns the skill as a model-facing block in opencode's `<skill_content>` shape: the skill name, the full content body, the base directory placeholder (skills are DB rows, so there is no file list — the block carries the content and name only).
- On approval, the panel records the output via the existing `addToolOutput` path and `sendAutomaticallyWhen` continues the turn with the skill in hand; on deny it records an `output-error` part, mirroring the existing deny path.

### Typed output union and renderer registry

- Following the strictness established by the chat tool presentation work, the shared types module gains a `skillOutputSchema` (`{ name: string, description: string, content: string }`), the `KnownToolOutput` union gains `{ tool: "skill"; output }`, and the exhaustive renderer registry gains a `skill` entry that renders the skill's name and description with a loaded state — not the full content body. The existing registry-completeness test iterates all registered tools, so shipping the tool without a renderer fails CI automatically.

### Management page

- A new dashboard page (reached from a navigation entry) hosts a Skills panel following the existing requests/expenses panel patterns: a list of the caller's skills, an inline create form (name, description, content), edit-in-place, and delete with confirmation.
- Panel state uses the template's list-store pattern; all mutations call the ownership-scoped API.
- UI strings live in the existing i18n message namespaces (en + zh), consistent with the rest of the app.

### Security

- Skills are read-only interactions from the chat's perspective: loading one makes no API calls beyond the ownership-scoped skill fetch and takes no ACL-guarded action by itself.
- Loading is gated behind the `always` approval policy, mirroring opencode's `skill` permission gate.
- A skill's workflow can only drive tools the caller already has, each still subject to its own approval policy and the caller's grants — a skill can never escalate access.
- Because skills are authored by the caller and loaded only with the caller's approval, skill content carries the same trust model as the existing custom prompt.

## Testing Decisions

- **What makes a good test:** assert external behavior only — the advertisement the model sees, the content block produced, the card rendered, and the ownership checks — not implementation details like which DB helper was called.
- **Pure-logic seam (primary):** the skills module — validation, advertisement formatting, and `<skill_content>` block formatting — unit-tested in the chat feature's existing `__tests__/` directory (prior art: `question-flow.test.ts`, `prompts.test.ts`, `sessions.test.ts`). Cover: valid/invalid skill records and per-field errors; duplicate name rejection; advertisement formatting with zero/one/many skills; the exact model-facing block for a sample skill.
- **Prompt seam:** the system-prompt builder's `Available skills:` section, covered through the same pure tests (prior art: `prompts.test.ts`).
- **Registry seam:** the existing registry-completeness test (`tool-renderers.test.ts`) must pass once the `skill` tool and its renderer exist — it iterates all registered tools including the global set.
- **Component seam:** the loaded-skill result card, tested with React Testing Library (prior art: `tool-result.test.tsx`); the management panel's create/edit/delete flow, tested with RTL against a mocked API (prior art: existing panel/store tests).
- **API/data seam:** ownership scoping is exercised through the pure ownership helper and the e2e suite, matching how the sessions feature is covered (no per-route unit tests exist for APIs in this repo).
- **Mock seam:** the deterministic mock model gains a skill intent so a full send → propose → approve → load → continue loop can be exercised under `AI_MOCK` (prior art: `mock-model.test.ts`).

## Out of Scope

- Shared or org-wide skill libraries, skill publishing/exchange, or importing from other users.
- Skill discovery from remote URLs or versioned caches (opencode's `skills.urls` / index.json model) — skills are DB rows authored in-app for now.
- Permission-vocabulary changes: skills are authenticated + ownership-scoped, with no new ACL domain or role-policy changes.
- Rendering or linting a skill's content beyond a plain markdown textarea.
- Versioning, history, or diffing of skill contents.
- Skills executing server-side or as standalone agents — a skill is purely a context document the model follows with existing tools.
- i18n of skill content itself (only the management UI strings are translated).

## Further Notes

- The `skill` tool is the second tool (after `question`) that deliberately blocks on user interaction — here via the existing approval card rather than a bespoke interaction. It rides the same `execute → addToolOutput → sendAutomaticallyWhen` loop, so no new streaming or transport machinery is needed.
- The design mirrors opencode's skills: frontmatter-less DB rows stand in for `SKILL.md`, the `Available skills` advertisement stands in for `<available_skills>`, and the `<skill_content>` output block keeps the model fluent about what it just loaded.
- Because the `skill` tool is global, it is present on every dashboard page's widget and on the `/chat` page, consistent with the copilot spec's rule that the `/chat` page exposes only global tools.
