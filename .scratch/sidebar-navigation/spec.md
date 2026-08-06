# Spec: Sidebar navigation that scales as pages are added

**Status:** ready-for-agent

## Problem Statement

next-zero is a template for enterprise admin dashboards. The sidebar is the primary wayfinding surface, but it was built for a handful of pages: nav is two flat arrays (`main` and `settings`) hardcoded in a constants module, the sidebar keeps a second hand-maintained icon registry that must be synced by hand, and the dashboard layout re-derives its route-gating map from the same two arrays. Adding the Access Requests page made it nine main items, and every future page makes the flat, ungrouped list harder to scan and adds a new place where the developer must remember to touch code (constants, icon map, layout, i18n). On mobile the sidebar degrades to an icon-only strip, which becomes unusable as pages multiply.

A template adopter evaluating this stack should see a navigation pattern that stays navigable at twenty pages the way it is at ten — and that shows the *right* way to add a page: one declarative entry, nothing else.

## Solution

A declarative, grouped navigation model that is the single source of truth for the sidebar and for route gating. Nav becomes an ordered list of labeled sections (`Overview`, `Management`, `Insights`, `Settings`), each holding its items; icons resolve from a registry co-located with the nav definition; adding a page is one entry in one module plus its i18n keys. The sidebar renders those sections, keeps ACL filtering and collapse, and gains three UX upgrades that make the nav navigable as it grows: labeled groups in expanded mode, a collapsed **icon rail with a hover flyout** (hover an icon to preview that section's pages), and a **mobile drawer** replacing the icon-only strip on small screens. Active page and active section stay highlighted, the `/403` route gating behavior is unchanged, and everything respects existing role permissions, i18n, and reduced-motion preferences.

## User Stories

1. As a template developer, I want to add a new page by editing a single declarative nav module, so that I never touch rendering code, icon registries, or route gating when adding a page.
2. As a template developer, I want to place a nav item in a logical section, so that related pages are grouped together without special-casing the sidebar.
3. As a template developer, I want section labels, ordering, and members declared next to the items, so that the information architecture is configurable data rather than scattered markup.
4. As a template developer, I want the dashboard layout's route gating to keep deriving from the same nav definition, so that a new page automatically inherits its ACL gate without editing the layout.
5. As a user with a limited role, I want only the pages my permissions allow to appear in the sidebar, so that I never see links to pages that would 403.
6. As an admin, I want every permitted page reachable from the sidebar, so that the nav reflects full system access.
7. As a viewer, I want to see only the pages my role allows (e.g. Requests but not Roles), so that the sidebar mirrors what I can actually do.
8. As a user, I want the sidebar organized into labeled groups, so that I can find pages quickly as the app grows.
9. As a user, I want the section containing the current page to stand out, so that I can tell where I am in the information architecture.
10. As a user, I want the current page highlighted in the nav, so that I can orient myself at a glance.
11. As a user, I want to collapse the sidebar to an icon rail, so that I can reclaim horizontal space for page content.
12. As a user with the sidebar collapsed, I want to hover a section icon to preview that section's pages in a flyout, so that I can still navigate anywhere without expanding the rail.
13. As a user, I want the collapsed flyout to close when I click elsewhere or press Escape, so that navigation never blocks the page.
14. As a mobile user, I want a hamburger control that opens the full navigation as a slide-over drawer, so that all pages are reachable on a small screen.
15. As a mobile user, I want the drawer to close after I choose a page, tap the backdrop, or press Escape, so that navigation does not get stuck open.
16. As a keyboard user, I want focusable nav links with visible focus indicators and correct ARIA state, so that I can navigate with a keyboard and screen reader.
17. As a user who prefers reduced motion, I want sidebar and flyout transitions to respect the OS setting, so that I am not disoriented by animation.
18. As a user, I want empty sections — every item filtered out by my role — to disappear, so that I do not see headers with nothing beneath them.
19. As a template developer, I want an optional declarative badge on an item (e.g. "New"), so that attention-grabbing markers are configured per page rather than hardcoded.
20. As a user, I want the existing collapse behavior, active states, and responsive behavior to keep working, so that this change is a pure improvement and not a regression.

## Implementation Decisions

- **New nav module as single source of truth.** A `lib/nav.ts` module owns navigation: ordered `NavSection[]`, each a `{ id, i18nKey, items }` with `NavItem = { href, i18nKey, requiredAction?, icon, badge? }`. The icon registry (string key → icon component) moves from the sidebar into the nav module. The flat `mainNavItems`/`settingsNavItems` arrays are removed from constants; `lib/constants.ts` keeps non-nav constants (permission domains, mock data).

- **Route gating unchanged in behavior.** The dashboard layout still computes its `routeActions` map by flattening all nav sections; `/403` redirects for missing `requiredAction` are preserved exactly. Adding a page to the nav automatically gives it an ACL gate.

- **Proposed grouping** (membership is a template decision the implementer can adjust): `Overview` — Dashboard, Chat; `Management` — Users, Roles, Access Requests, API Keys; `Insights` — Audit Log, Reports, System Health; `Settings` — Settings, Notifications, Profile. An item without `requiredAction` (Profile) stays visible to every authenticated user.

- **Expanded sidebar renders sections.** Section labels are small uppercase eyebrows above their items. A section whose items are all filtered out by the user's role renders nothing (label included).

- **Collapsed rail with hover flyout.** Collapsed mode shows the section icons; hovering a section's icon opens a flyout showing the section label plus its visible items as labeled links (the flyout replaces bare tooltips as the primary collapsed affordance). The flyout closes on outside click and Escape and is keyboard accessible.

- **Mobile drawer.** Below the existing breakpoint the sidebar is replaced by a slide-over drawer opened from a hamburger control in the topbar. It renders the full grouped nav, highlights the active page, and closes on selection, backdrop tap, or Escape. Drawer open state lives in the existing UI store.

- **Active states.** The active link uses the existing pathname prefix match and gains `aria-current="page"`; the containing section is visually marked active when any of its items is active.

- **i18n.** Item labels continue to reuse the existing `nav.*` keys (wayfinding vocabulary is unchanged and matches page titles). New keys are added in both supported languages (en and zh): `nav.group.*` for section labels and `nav.badge.new` for the optional badge.

- **Accessibility & motion.** Visible focus rings, `aria-expanded`/focus management on the flyout and drawer, Escape closes overlays, and width/flyout transitions respect `prefers-reduced-motion`.

- **No schema, API, or data-model changes.** Pure frontend: the dashboard layout, sidebar, topbar, UI store, and the nav constants are the only areas touched.

## Testing Decisions

- **One seam: Playwright e2e**, consistent with the app's existing e2e approach. Tests assert external behavior at the UI boundary — what a user with a given role sees and can click — never implementation details (no assertions on module structure, class names, or component internals).

- **New `e2e/sidebar.spec.ts`** using the existing role storage states (`admin.json`, `viewer.json`), plus an `auditor.setup.ts` storage state added for this feature (an Auditor has `reports:Read`/`audit:Read` only, so it is the natural role for empty-section and hidden-group assertions). Prior art: `e2e/pages.spec.ts` (role-based assertions), `e2e/requests.spec.ts` (UI flows), `e2e/auth.setup.ts`/`viewer.setup.ts`/`admin-normal.setup.ts` (role states).

- **Scenarios to cover:**
  - Per-role visibility: viewer sees Dashboard, Chat, Users, Requests but not Roles/API Keys; admin sees all sections.
  - Section labels render in expanded mode; an Auditor sees no "Management" section (all items filtered).
  - Collapsed rail: hovering a section icon shows a flyout with that section's labeled items; clicking a flyout item navigates to that page.
  - Mobile viewport: hamburger opens the drawer, a nav item navigates and closes the drawer, backdrop/Escape closes it.
  - Active page is marked (and `aria-current` is present on the active link).
  - A page added to the nav (via the declarative module) shows up without touching the sidebar — covered structurally by asserting the current nine main items render from the same data that gates routes.

## Out of Scope

- Nested two-level (expandable parent) sub-menus — the grouped flat list is the target; nested parents are a future enhancement if the app grows to that point.
- End-user personalization (reordering, pinning, hiding items persisted per account).
- Visual rebrand of the app (palette, typography, logo) — this is structure and navigation UX using the existing design tokens, not a redesign.
- Server-driven navigation or per-section i18n from a backend.
- Pages outside the authenticated dashboard layout.

## Further Notes

- This is the follow-up to the Access Requests feature, whose `/requests` entry exposed the flat-list and manual-icon-registry pain.
- The e2e-only seam keeps the whole feature verified at the UI boundary; the pure nav-visibility logic it relies on is exercised implicitly through the role-based visibility tests rather than as a second unit-test seam.
