# Spec: Question tool for the chat copilot

**Status:** ready-for-agent

## Problem Statement

The chat copilot can propose tool calls and get approve/deny on each, but the assistant has no sanctioned way to ask the user anything mid-task. When it hits a genuinely ambiguous decision — which record to act on, which direction to take, which values to use — it must either guess or resort to free-form text in the hope the user replies. For a normal user, a guessed action is worse than no action: it can mutate the wrong row in the workspace, and nothing in the tool contract lets the assistant pause and collect a structured answer.

We want the assistant to be able to stop and ask, the same way opencode's `question` tool does: one or more structured multiple-choice questions with optional custom typed answers, rendered as an interactive card in chat, with the user's answers fed back to the model so it continues the task with its choices in mind.

## Solution

A `question` builtin tool, registered once as a global tool so it is available on every page and on the `/chat` page:

- The assistant calls it with one or more questions, each with a short label (`header`), full text, a list of options (label + description), and flags for multi-select and custom typed answers.
- The chat panel renders an interactive question card instead of an approval card: radio options for single-select, checkboxes for multi-select, a "type your own answer" option when `custom` is enabled, and a tabbed step-through when the tool asks several questions at once. A single single-select question submits as soon as an option is picked.
- Answering resolves the tool call; the assistant's output is the answers plus a human-readable summary; the existing auto-send loop then continues the turn with the answers in mind. Dismissing records a refusal, mirroring opencode's "The user dismissed this question".

## User Stories

1. As an authenticated user, I want the assistant to ask me a structured question during a task, so that it can collect my choice instead of guessing.
2. As an authenticated user, I want a question to render as a card in the chat, so that I can answer it without reading technical payloads.
3. As an authenticated user, I want a single-choice question to submit the moment I pick an option, so that answering is quick.
4. As an authenticated user, I want a multi-select question to let me toggle several options and then confirm, so that I can give compound answers.
5. As an authenticated user, I want each option to carry a short description, so that I understand the tradeoffs before choosing.
6. As an authenticated user, I want to type my own answer when none of the options fit, so that I am not forced into a choice.
7. As an authenticated user, I want to dismiss a question, so that the assistant cannot block indefinitely on my answer.
8. As an authenticated user, I want several questions asked in one call to be presented one at a time with progress, so that I can answer them in order.
9. As an authenticated user, I want my answers to be fed back to the assistant, so that it continues the task with my choices in mind.
10. As an authenticated user, I want the answered question card to show a summary of my answers, so that the history reads clearly after the fact.
11. As an authenticated user resuming a session, I want an unanswered question to still be answerable after a reload, so that I do not lose the thread.
12. As a developer, I want the question tool registered once as a global tool, so that it is available on every page with no per-page wiring.
13. As a developer, I want the question tool to ride the same execution path as every other tool (execute → tool output → auto-send), so that no parallel streaming or transport mechanism is introduced.
14. As a developer, I want the model to receive a formatted summary of the answers, so that it stays fluent rather than parsing a raw JSON payload.
15. As a developer, I want the question tool added to the typed output union and the renderer registry, so that the existing completeness checks keep CI green.
16. As a developer, I want the question-flow interaction semantics (single/multi/custom/dismiss, multi-question stepping) to live in a pure, unit-testable module, so that edge cases are pinned down cheaply.
17. As a developer, I want the question tool to never exceed the caller's permissions, so that it is a read-only interaction with no new ACL surface.

## Implementation Decisions

### Tool contract: optional execution context

- `ChatTool.execute` is extended to `(args: unknown, context?: { toolCallId: string }) => ToolExecutionResult | Promise<ToolExecutionResult>`. The parameter is optional and backward compatible; existing tools are unchanged. It is needed so a tool whose execution must wait for user input can key its pending state to the tool call.

### The `question` global tool

- A new global `ChatTool` with id `question`, name "Ask the user", approval `auto`, and a zod input schema mirroring opencode's question prompt shape: `questions` (non-empty array) where each entry is `{ question, header, options: [{ label, description }], multiple?, custom? }`. `header` is a short label (max ~30 chars); `label` is concise display text (1–5 words); `multiple` and `custom` default to false/true respectively.
- Because it is registered in the global tool set, it appears in the active tool definitions sent with every chat request and needs no page scope.

### Pending-question registry (in-memory, keyed by tool call)

- The tool's `execute` validates its arguments, registers a pending question `{ toolCallId, questions }` in an in-memory module-scoped registry (the same shape as opencode's `pending` map — deferred-based, never persisted), and returns a promise.
- The promise resolves with `{ ok: true, data: { answers, summary } }` when the user answers, or rejects with a dismissal error.
- `answerQuestion(toolCallId, answers)` and `dismissQuestion(toolCallId)` are the only two write entry points; they settle the matching deferred and remove the registry entry.
- On reload of a session containing an unanswered question, the restored part is still `input-available`; the auto-execute pass re-registers a fresh pending entry for the same tool call id and the card renders again, so the question stays answerable. An abandoned (never answered) question simply leaves an open deferred; it does not persist state beyond the existing parts.

### Interactive question card

- The chat panel's tool card detects the `question` tool and, while the part is `input-available`, renders an interactive question card body instead of the approve/deny body and instead of raw argument JSON.
- The card implements the interaction directly: the short label and question text, the option list (radio for single-select, checkbox for multi-select) with descriptions, a "type your own answer" option when `custom` is enabled, and, for multi-question calls, tabbed progress with next/back and a final submit step.
- Submitting calls `answerQuestion(toolCallId, answers)`; the tool's `execute` resolves, the panel records the output via the existing `addToolOutput` path, and `sendAutomaticallyWhen` continues the turn with the answers in hand.
- Dismissing calls `dismissQuestion(toolCallId)`; the tool's `execute` rejects, and the panel records an `output-error` part with the message "The user dismissed this question" (mirroring opencode's rejection error).

### Question-flow logic module (pure, shared with the card)

- A pure module in the chat feature owns the interaction semantics, modeled on opencode's `question.shared.ts` but trimmed to pointer/click input rather than keyboard navigation: per-question selected answers, custom-text state, single-select immediate submit, multi-select toggle, stepping between questions, and final submit that builds the `string[][]` of answers (one array per question, in order).
- The card keeps its React state thin and drives transitions through these pure functions, so the single- vs multi-question and custom-answer edge cases are unit-testable without rendering.

### Model-facing output

- `execute` returns `{ answers: string[][], summary: string }`, where `summary` is the opencode `toModelOutput` format — e.g. `User has answered your questions: "<question>"="a, b", ...`. The summary is what keeps the model fluent; the structured `answers` array keeps the payload machine-readable. The existing tool-output serialization carries both as JSON.

### Typed output union and renderer registry

- Following the strictness established by the chat tool presentation work, the shared types module gains `questionOutputSchema` (`{ answers: string[][], summary: string }`), the `KnownToolOutput` union gains `{ tool: "question"; output }`, and the exhaustive renderer registry gains a `question` entry that renders the answers summary (per-question question text plus the selected labels, or an "Unanswered" state). The existing registry-completeness test iterates all registered tools, so shipping the tool without a renderer fails CI automatically.

### Security

- The tool is a read-only interaction: it makes no API calls and takes no ACL-guarded action. No new permission vocabulary is introduced; per-tool ACL policy for it is the existing `approval: "auto"` with no effect on the caller's grants.

## Testing Decisions

- **What makes a good test:** assert external behavior only — the card the user sees and the answers that flow to the model — not implementation details like which registry helper was called.
- **Pure-logic seam (primary):** the question-flow module and the answer-to-output formatting, unit-tested in the chat feature's existing `__tests__/` directory (prior art: `approval.test.ts`, `scopes.test.ts`, `model-messages.test.ts`). Cover:
  - Single single-select question submits immediately with one answer.
  - Multi-select toggles multiple labels and submits the full set.
  - Custom answer replaces (single) or appends/removes (multi); clearing a custom answer removes it.
  - Unanswered questions produce an empty answers array; dismissal maps to the rejection path.
  - Multi-question flows step through in order and final submit builds `string[][]` per question.
  - The summary string matches the expected model-facing format.
- **Component seam:** the interactive question card, tested with React Testing Library (prior art: `tool-result.test.tsx`, `markdown.test.tsx`). Cover: options and descriptions render; a single-select click submits; multi-select toggles and submits; custom input appears and commits; dismiss is reachable; multi-question progress renders; no raw JSON is shown.
- **Registry seam:** the existing registry-completeness test (`tool-renderers.test.ts`) must pass once the `question` tool and its renderer exist — it iterates all registered tools including the global set.
- **Not covered by e2e:** the full send → card → answer → continue loop is verified deterministically at the logic and component seams for now; the chat-copilot `AI_MOCK` e2e seam remains available if a full-loop regression is wanted later.

## Out of Scope

- Free-form conversational turn-taking (the model asking in plain text and waiting) — the tool is the sanctioned question path.
- Persisting in-flight question interaction beyond the existing parts persistence (unanswered questions restore as answerable `input-available` parts; no new table or column).
- End-user or per-page changes to the question tool's approval policy at runtime.
- Voice/audio answering, attachments, or model-switcher integration.
- Multi-user collaboration on a single question (another user answering on behalf of the caller).
- Server-side rendering or server-side execution of questions — tool execution is client-side by design.
- i18n of question strings beyond the existing `chat` message namespace.

## Further Notes

- The question tool is the one tool that blocks its own execution by design; it deliberately rides the same `execute → addToolOutput → sendAutomaticallyWhen` loop, so the model cannot advance until the user answers and no new streaming/transport machinery is needed.
- The design mirrors opencode's question tool (question/option/header schema, ask–reply–reject semantics, model-facing summary) adapted to next-zero's client-side execution model and React rendering.
- Because the question tool is global, it is present on every dashboard page's widget and on the `/chat` page, consistent with the copilot spec's rule that the `/chat` page exposes only global tools.
