# Spec: LLM-generated chat session titles

**Status:** ready-for-agent

## Problem Statement

Session titles in the chat framework are today the raw first user message, truncated to 60 characters. A prompt like "how do you generate session title" produces a session titled "how do you generate session title" — verbose, punctuation-heavy, and not representative of what the conversation is actually about. Chat products like Claude AI generate a short, low-key phrase (e.g. "Generating session titles") from the first message, which reads far better in a conversation list. We want the same behavior: the model synthesizes a concise title from the first user message, with the existing truncation heuristic kept only as a fallback.

## Solution

When a new session's first turn is persisted, the server generates a concise title for it by calling the existing chat model with a short title-generation prompt built from the first user message (the `message_content` in Claude's terms). The result is sanitized (trimmed, stripped of quotes/markdown/trailing punctuation, capped at 60 characters) and stored on the session. If generation fails, is disabled, times out, or returns nothing usable, the session falls back to the existing truncated-first-message heuristic, so a session is never left untitled. A title is generated once per session — on the first save only — and never regenerated. The dropdown and persistence flow are unchanged: the existing message-save response already carries the updated session, so the title appears in the conversation list without any client-side change.

## User Stories

1. As a chat user, I want a new session's title to be a short LLM-generated phrase that captures my first message, so that my conversation list reads clearly instead of showing raw pasted prompts.
2. As a chat user, I want the generated title to appear in the conversation dropdown automatically after my first exchange, so that I never have to name conversations myself.
3. As a chat user, I want a session to still get a title when generation is unavailable or fails, so that my conversations are never left untitled.
4. As a chat user, I want the title to be set once and never change, so that a session's name stays stable as the conversation evolves.
5. As a chat user, I want generated titles capped at 60 characters, so that long prompts do not bloat the conversation list.
6. As a chat user, I want titles cleaned of quotes, markdown, and trailing punctuation, so that the dropdown looks tidy.
7. As a chat user, I want my existing conversations to keep their current titles, so that this feature does not rename history.
8. As a chat user, I want the title visible in the dropdown after a reload, so that resumed conversations keep their name.
9. As an operator, I want a slow or broken title-generation call to never block message persistence for long, so that saving a turn always completes.
10. As an operator, I want the title-generation timeout to be configurable, so that deployment-specific model latency can be accommodated.
11. As a developer, I want generation to reuse the existing chat model, so that no new provider configuration is needed.
12. As a developer, I want generation to run inside the existing message-save path, so that there is no new API route or client change.
13. As a developer, I want generation failures to degrade to the existing heuristic silently, so that the save endpoint never errors because of title generation.
14. As a developer, I want the title generation to be deterministic under the mock model, so that CI tests run without a network or LLM key.
15. As a developer, I want the pure sanitization logic unit-testable, so that edge cases (quotes, whitespace, over-length output) are locked down.
16. As a developer, I want the generation helper to accept an injected model, so that its behavior (failure, timeout, sanitized success) is directly testable without env-var tricks.

## Implementation Decisions

### Title policy (pure)

- A new pure module owns the title policy: `TITLE_MAX_LENGTH = 60`, the `TITLE_SYSTEM_PROMPT` constant, and a pure `sanitizeTitle(text)` that trims, strips surrounding quotes, collapses internal whitespace, and caps the result at `TITLE_MAX_LENGTH`. The system prompt instructs the model to reply with a single short noun phrase or imperative title with no quotes, trailing punctuation, or markdown; it contains a stable marker string so the mock model can recognize title-generation calls.
- The prompt and max length mirror the Claude contract conceptually: `message_content` in, a single title string out. There is no `recent_titles` dedup.

### Generation helper (server)

- A new server helper `generateSessionTitle(messageContent, model = getChatModel())`:
  - returns `null` when the chat feature is disabled;
  - calls the (injectable, default `getChatModel()`) model via the AI SDK text generation with the title system prompt and `messageContent` as the user content;
  - is wrapped in a timeout read from `AI_TITLE_TIMEOUT_MS` (default `5000` ms);
  - passes the raw model text through `sanitizeTitle`;
  - returns `null` on any error, timeout, or empty result (sanitize caps the length), logging a warning so degradation is visible;
  - callers fall back to the existing heuristic.
- The optional `model` parameter is the only new test seam; the production call site uses `getChatModel()` as before.

### Persistence wiring

- `saveSessionMessages` extracts the first user text part once, and when the session has no title yet sets `title = generated ?? seedTitleFromMessages(messages)`. Once a title exists it is never regenerated. Extraction reuses the same first-user-text logic as the existing heuristic so `message_content` is defined identically.

### Mock model

- `createMockModel` detects a title-generation call via the system-prompt marker and returns the truncated first user message as the title text — identical to what the heuristic fallback would produce — so mock mode is behavior-preserving and deterministic. Existing tool-call and canned-text flows are unchanged.

### Configuration

- `.env.example` gains `AI_TITLE_TIMEOUT_MS` alongside the existing `AI_*` variables; the value is read at call time with the 5000 ms default.

### No other changes

- No new API route; no changes to the client, chat provider, or session list UI — the dropdown updates via the existing save-response upsert. `recent_titles` is not implemented.

## Testing Decisions

- **What makes a good test:** assert external behavior — a usable title is produced from a message, respects the length and sanitization rules, is stable once set, and the message-save path never fails because of generation — not the internals of the model call.
- **Persistence seam (existing, highest):** the Postgres smoke test (`PG_SMOKE=1`) exercises `saveSessionMessages`; with the mock model the generated title equals the truncated first message, so the existing title assertion stays green unchanged and proves the wiring end to end.
- **Generation helper seam (new, minimal):** `generateSessionTitle` is unit-tested with an injected stub model — disabled → `null`, model error and timeout → `null`, unsanitized/over-length output → sanitized title, success → sanitized title.
- **Model seam (existing):** `mock-model` unit tests cover title-prompt detection returning the truncated first user message and confirm the existing tool-call/canned-text flows are untouched.
- **Pure logic seam (existing pattern):** `sanitizeTitle` and the prompt constant are unit-tested for cap, quote-stripping, whitespace collapsing, and empty input. Prior art: `features/chat/lib/__tests__/sessions.test.ts`.
- **e2e (existing):** the "sessions persist, resume, and soft-delete" Playwright test already asserts the title appears in the dropdown after reload; in mock mode titles mirror the first message, so the assertion holds and guards the wiring. Prior art: `e2e/chat.spec.ts`.
- **Manual smoke (not CI):** with a real `AI_API_KEY`, a first message yields a synthesized title distinct from the raw message.

## Out of Scope

- `recent_titles` duplicate-title avoidance (Claude's request field) — explicitly rejected.
- A dedicated title model / separate `AI_TITLE_*` provider config — generation reuses `getChatModel()`.
- Title regeneration when the conversation's topic shifts; titles are set once on the first save.
- Manual title editing/renaming in the UI.
- Per-user title styling, language, or prompt settings.
- A "generating…" UI state — generation completes before the save response returns, so the dropdown simply updates once.
- Any new API route or client-side change.

## Further Notes

- The feature is deliberately behavior-preserving in mock mode: the mock's title equals the heuristic fallback, so existing unit and e2e assertions hold while the real model path synthesizes titles. The only place the two diverge is the injected-stub tests of the generation helper.
- `AI_TITLE_TIMEOUT_MS` is read at call time, so it can be changed per environment without a redeploy of code paths.
- This spec supersedes the "title is auto-seeded from the first user message" sentence in the chat-copilot spec for new sessions; existing sessions keep whatever title they already have.
