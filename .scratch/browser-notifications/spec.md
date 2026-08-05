# Spec: OS-level browser notifications for chat completion

**Status:** ready-for-agent

## Problem Statement

next-zero ships an in-app notification inbox (`/notifications`) and a chat assistant, but neither can reach the user when they are not looking at the tab. In-app records are mock data and render only while the page is open; the chat assistant streams replies that the user may miss if they switch tabs while a turn is in flight — and an approval card can sit waiting indefinitely for a user who has no idea it arrived. There is no OS-level alerting at all.

We want **browser notifications** (the Web Notifications API) as a first-class template feature: a permission + preference surface on the existing Notifications page, and a trigger that fires an OS notification when the chat assistant finishes a reply or waits for tool approval while the tab is backgrounded. It must work with zero server infrastructure and zero new runtime dependencies, so the template deploys unchanged.

## Solution

A client-only `features/notifications/` module wrapping the Web Notifications API:

- **A permission + preference surface.** A "Browser notifications" card on `/notifications` with an enable toggle (which performs the `Notification.requestPermission()` call from the user's click), per-category checkboxes, a status read-out (granted / denied / unsupported), and a "Send a test notification" button so the whole flow is verifiable without waiting for a real event.
- **One hook, one decision seam.** `useBrowserNotifications()` reads permission + preferences and exposes `notify(category, payload)`. A pure `shouldNotify()` function decides whether an event actually produces an OS notification, so every rule is unit-testable without a browser.
- **A chat trigger.** `ChatProvider.onFinish` calls a helper from the notifications module. It fires only when the document is hidden (the user left the tab), and emits two distinct payloads: *reply finished* and *waiting for your approval* (detected from a pending tool call in the final assistant message).
- **Preferences persisted client-side.** `{ enabled, categories: { chat, system } }` in `localStorage` under a stable key, validated on read. No backend, no cross-device sync.

## User Stories

1. As an authenticated user, I want to enable browser notifications from the Notifications page, so that I receive system-level alerts for events I care about.
2. As an authenticated user, I want the permission prompt to be triggered by my explicit click, so that I understand exactly why the browser is asking.
3. As an authenticated user, I want the Notifications page to show my current permission and preference state, so that I know whether browser notifications are working.
4. As an authenticated user, I want a clear blocked/unavailable state when the browser denies permission or does not support notifications, so that I understand why nothing fires.
5. As an authenticated user, I want to choose which event categories may fire a browser notification, so that I am only interrupted for what matters to me.
6. As an authenticated user, I want my preferences to persist across reloads and visits, so that I do not have to reconfigure them.
7. As an authenticated user, I want an OS notification when the chat assistant finishes a reply while I am on another tab, so that I know the answer is ready without checking.
8. As an authenticated user, I want a distinct notification when the assistant is waiting for my approval of a tool call, so that I can return to the tab and approve.
9. As an authenticated user, I want chat notifications to fire only while the tab is not visible, so that I am not interrupted when I am actively looking at the app.
10. As an authenticated user, I want a "Send a test notification" button, so that I can verify permission and rendering without waiting for a real event.
11. As an enterprise user, I want notification payloads to avoid leaking sensitive content, so that an OS notification never exposes tool arguments or raw workspace data.
12. As a template developer, I want the notification logic in a single feature module with pure decision functions, so that new trigger sources are trivial to add.
13. As a template developer, I want no new runtime dependencies and no server changes, so that the template's deploy surface stays exactly as it is.

## Implementation Decisions

### Module layout

- A `features/notifications/` module owns everything, mirroring `features/chat/`:
  - `lib/support.ts` — capability detection and permission state (`typeof window === "undefined"` guard, `"Notification" in window` check, `Notification.permission`).
  - `lib/preferences.ts` — `BrowserNotificationPreferences` type, defaults, `readPreferences(storage)` / `writePreferences(storage, prefs)` with schema validation (missing/corrupt entries fall back to defaults). Storage is injected so tests can use an in-memory object.
  - `lib/policy.ts` — `shouldNotify(...)` pure decision.
  - `lib/chat.ts` — `isTurnAwaitingApproval(messages)` and `buildChatNotification(messages)` (pure).
  - `hooks/use-browser-notifications.ts` — the client hook used by the card and the chat trigger.
  - `components/browser-notifications-card.tsx` — the card rendered on `/notifications`.
- No new permission vocabulary: the page is already behind `notifications:Read`; the card and trigger add no ACL surface, matching the chat framework's "gated by authentication only" stance.

### The hook and the decision seam

- `useBrowserNotifications()` returns `{ supported, permission, requestPermission, notify, preferences, setPreferences }`. `notify(category, payload)` no-ops unless `shouldNotify(...)` passes.
- `shouldNotify` is a pure function over the same inputs it receives from the browser/state:

  ```
  shouldNotify({ supported, permission, prefs, category, documentHidden })
  ```

  Rules, all must hold for a real event (not the test button):
  - `supported` is true (browser has the API).
  - `permission === "granted"`.
  - `prefs.enabled` is true and the `category` toggle is on.
  - For the chat trigger only: `documentHidden === true` — OS notifications are for when the user is not looking; never toast while the tab is focused.

### Preferences model

- `BrowserNotificationPreferences = { enabled: boolean; categories: { chat: boolean; system: boolean } }`. Defaults: `{ enabled: false, chat: true, system: true }`.
- Persisted to `localStorage` under `"browser-notifications:prefs"` (the repo already uses a similar pattern in `chat-store` via zustand persist). Read is validated; a corrupt or missing blob yields defaults.
- `system` is wired today only through the test button and stands as the forward-looking category for the in-app notification record source (out of scope; see below).
- Naming: the in-app `Notification` interface from `lib/constants.ts` shares its name with the DOM `Notification` global. The new module avoids importing the in-app type (and any other collision) so the DOM API is unambiguous; feature-local types are named `BrowserNotification*`.

### Permission flow

- The enable toggle's click handler performs `Notification.requestPermission()` — the prompt must originate from a user gesture to be reliable across browsers. The toggle flips on only after permission resolves `"granted"`; on `"denied"` the card shows the blocked state (with a hint that the user must change it in browser settings) and does not enable.
- If the browser lacks the API, the card renders the unsupported state and the toggle is disabled.
- The "Send a test notification" button fires one sample notification per enabled category (chat / system) so the user can preview each; it requires the toggle on, and works even when the tab is focused (it is an explicit user action, so the `documentHidden` rule does not apply).

### Chat trigger wiring

- In `features/chat/components/chat-provider.tsx` `onFinish` (after the existing persistence block), call `notifyChatTurnFinished({ messages: msgs })` — a small exported function from `features/notifications/lib/chat.ts`. This is the only change to chat code, and the dependency is one-directional (chat → notifications).
- `notifyChatTurnFinished` reads preferences + permission via the same storage seam, checks `shouldNotify` (with `document.hidden`), and:
  - if the final assistant message contains a pending (unexecuted) tool call → payload variant *waiting for approval* (detected by `isTurnAwaitingApproval`, which inspects the AI SDK message parts for an unwound tool invocation, the same signal the provider already relies on via `lastAssistantMessageIsCompleteWithToolCalls`);
  - otherwise → payload variant *reply finished*.
- Payload hygiene (story 11): the body is the first line of the assistant's text truncated to ~140 characters with an ellipsis; it never includes tool arguments, raw `parts`, or the caller's claims. Titles are short and constant (localized).

### The card UI

- Rendered on `app/(dashboard)/notifications/page.tsx` below the existing list, as its own `Card` ("Browser notifications"). Contents:
  - Status line: "Notifications are on" / "Blocked in browser settings" / "Not supported in this browser" / "Permission not requested yet".
  - Enable toggle (performs `requestPermission` on click, per above).
  - Category checkboxes: "Assistant finished" (chat), "System alerts" (system), disabled while the feature is off.
  - "Send a test notification" button, disabled while the feature is off.

### i18n

- New keys under the existing `notifications` namespace, `notifications.browser.*`, added to both `messages/en.json` and `messages/zh.json`: card title/description, status strings (granted/denied/unavailable), enable label, category labels, test-button label, and the chat payload strings (`browser.chat.finishedTitle`, `browser.chat.finishedBody`, `browser.chat.waitingTitle`, `browser.chat.waitingBody`).

## Testing Decisions

- **What makes a good test:** assert external behavior — what the user sees and whether an OS notification is emitted — not implementation details. Pure decision logic is unit-tested at the seam of its pure functions; the permission/preference card is tested with React Testing Library against a mocked DOM `Notification`.
- **Vitest (pure logic).** Prior art: `features/chat/lib/__tests__/*`, `lib/__tests__/acl.test.ts`. Covered:
  - `shouldNotify` decision matrix: supported/unsupported, each permission state, enabled/disabled, per-category toggles, and the `documentHidden` rule for chat vs. the test button.
  - `readPreferences` defaults on missing/corrupt storage, and round-trip `writePreferences`/`readPreferences` with an injected in-memory storage.
  - `isTurnAwaitingApproval` on AI SDK message parts (pending tool call vs. completed turn), and `buildChatNotification` title/body selection + 140-char truncation with no tool arguments leaking.
- **RTL component test.** Mock `globalThis.Notification` (permission getter, `requestPermission` resolving granted/denied) and assert the card's states and that clicking enable calls `requestPermission`. Prior art: `features/chat/components/__tests__/*`.
- **Docker Playwright e2e (best-effort).** The OS popup itself cannot be asserted, so the e2e stubs the constructor. Prior art: `e2e/chat.spec.ts` with `AI_MOCK=1`. Covered:
  - With a browser context that grants `notifications` permission and a `page.addInitScript` stub recording `new Notification(...)` calls, force `document.hidden` (via CDP `Emulation.setPageVisibilityState` or a `page.evaluate` getter override), run one mock chat turn, and assert the stub recorded a "reply finished" call.
  - The card renders the granted/denied states when the permission resolves accordingly.

## Out of Scope

- **Web Push / service worker notifications** (VAPID keys, subscription storage, push server) — requires backend infrastructure; a future template extension, not this spec.
- Notifications when the app is closed or the device is offline.
- Cross-device preference sync (localStorage is per-device; a real backend would move prefs server-side).
- Replacing the mock in-app notification data or wiring a system-alert event source (the `system` category is present but only exercised via the test button).
- Sound, custom icons beyond the default, and notification actions/buttons.
- In-app notification mirroring — this feature only emits OS-level toasts; it does not write rows to the in-app inbox.

## Further Notes

- Zero new dependencies and zero server changes: the Web Notifications API is a browser global, and the only chat-code change is the single `onFinish` call. The template's deploy surface is unchanged, matching the chat framework's env-config gating philosophy.
- The `shouldNotify` seam is the extension point: a future trigger source (system alert, report ready, tool long-run) is a one-line call to `notify(category, payload)`; a future category is a checkbox in the card, a `localStorage` default, and a `shouldNotify` branch.
- `document.hidden` gating is what keeps the feature polite: while the user is actively using the app, the existing in-app UI is the notification surface; the OS level is reserved for when they are not watching.
