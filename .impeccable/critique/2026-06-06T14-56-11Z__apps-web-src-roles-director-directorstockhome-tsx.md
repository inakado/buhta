---
target: "директорский контур: Остатки -> Курьеры, таблица товаров курьеров, История, mobile"
total_score: 24
p0_count: 0
p1_count: 3
timestamp: 2026-06-06T14-56-11Z
slug: apps-web-src-roles-director-directorstockhome-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/update states are present, but dense rows and clipped areas make current state harder to scan on mobile. |
| 2 | Match System / Real World | 3 | Domain terms are mostly right: Остатки, Курьеры, История, Продукция, Наличные. |
| 3 | User Control and Freedom | 3 | Tabs, reset filters, and detail dialogs exist. |
| 4 | Consistency and Standards | 2 | History rows change structure at <=380px in a way that reads as broken, not adapted. |
| 5 | Error Prevention | 2 | Read-only reduces write risk, but cramped rows increase the risk of reading the wrong amount or quantity. |
| 6 | Recognition Rather Than Recall | 2 | Dense filters and icon-only bottom navigation rely on learned structure. |
| 7 | Flexibility and Efficiency | 3 | Filters are powerful for audit work, but too heavy for first mobile scan. |
| 8 | Aesthetic and Minimalist Design | 2 | History filter block and repeated table headers consume too much vertical space. |
| 9 | Error Recovery | 2 | Error states exist, but recovery/next action is not prominent in this scope. |
| 10 | Help and Documentation | 2 | Empty states exist, but the audit/checking workflow is not guided. |
| **Total** | | **24/40** | **Usable foundation, but narrow-mobile layout needs a focused pass.** |

#### Anti-Patterns Verdict

**LLM assessment**: This does not look like generic AI slop. The director contour is restrained, utilitarian, and close to the product register. The failure mode is more specific: mobile CRM screens are still carrying desktop table habits. The result is not decorative chaos, but cramped operational UI that can mislead under pressure.

**Deterministic scan**: `detect.mjs` found one warning in `apps/web/app/globals.css:48`: overused font, `font-family: Helvetica`. I treat this as a false positive for this product. `docs/FRONTEND.md` explicitly allows a neutral system/grotesk stack for the CRM, and the current issue is layout, not font personality.

**Visual overlays**: Browser mutation preflight succeeded. Overlay injection was attempted through `.agents/skills/impeccable/scripts/live-server.mjs --background`, but the helper timed out waiting for the live server to start, so no reliable user-visible overlay was available. Browser inspection was still performed directly with Playwright snapshots at 320, 360, and 390px.

#### Overall Impression

The director contour is directionally right: calm, flat, compact, and not trying to entertain. The main problem is that `История` and stock tables are not adapting as mobile-native lists. The worst break is on 320-360px history rows: the chevron drops into the left side of the next line, rows become 100-127px tall, and the list looks broken.

#### What's Working

- `Остатки -> Курьеры` now uses a flat ledger style instead of decorative cards. The courier blocks feel closer to a working ведомость.
- The segmented control `Распределитель / Курьеры` is understandable and keeps director stock in one place.
- Operation history has useful backend-backed filters and detail dialogs. The data model is ready for audit work.

#### Priority Issues

**[P1] History rows break on narrow screens**

Why it matters: At 320 and 360px, the history row's chevron falls to the left under the text, and rows expand to roughly 100-127px. This makes the list look malformed and wastes the first viewport.

Fix: Redesign the <=380px row as a deliberate two-line mobile event row: title and chevron on the first line, actor/date/source as a compact second line, amount/quantity as a right-aligned badge or inline trailing meta. Do not let the chevron become a stray icon on the next row.

Suggested command: `$impeccable adapt История директора на узких экранах`

**[P1] History starts with a wall of filters**

Why it matters: At 320/360/390px, the filter block is about 271px tall. Events begin around y=374-391, so the director sees filters before seeing history. For a checking workflow, the list should be the primary object.

Fix: Collapse secondary filters behind a compact filter button or use a summary row with period first and advanced filters in a sheet/dialog. Keep date range visible only if it is the dominant workflow.

Suggested command: `$impeccable distill История директора`

**[P1] Layout changes get worse just above the 380px breakpoint**

Why it matters: At 390px, the shell gets outer padding and a shorter inner content area, while the bottom nav sits higher. In `Остатки -> Курьеры`, the second courier total is visually under the bottom nav in the initial viewport. At 360px it is cleaner because the mobile breakpoint removes outer padding.

Fix: Align shell/bottom-nav/content height rules across 360-430px. The scrollable content needs stable bottom safe space and should not appear clipped under the nav at the first breakpoint above 380px.

Suggested command: `$impeccable adapt mobile shell breakpoints`

**[P2] Courier товарная ведомость is readable with current seed data, but structurally fragile**

Why it matters: The current 3-column ledger works for short names like `Икра А`, but it is not resilient for longer product names, longer prices, or more couriers. It also repeats a table header inside every courier block, which adds noise.

Fix: Convert each courier product row to a mobile ledger row: product name and unit price on the left, quantity and total as a compact right column. Keep the table header only if there are enough rows to justify it, or replace it with column alignment through typography.

Suggested command: `$impeccable layout Остатки -> Курьеры`

**[P2] Distributor stock action overflows its cell at 320px**

Why it matters: In `Остатки -> Распределитель`, the `Снизить цену` button is wider than its table cell at 320px. It does not create horizontal scroll, but it visually escapes its column and makes the row feel crooked.

Fix: Move row actions out of the tight amount column on mobile: use an icon button with accessible label, a trailing action row, or a row details/edit affordance.

Suggested command: `$impeccable adapt Остатки -> Распределитель`

#### Persona Red Flags

**Директор на телефоне**: Wants to quickly check courier stock and cash. The courier ledger is compact, but at 390px the second courier block is partially hidden by the bottom nav, and at narrower widths the director has to parse repeated table headers.

**Аудитор / сверка**: Wants to find who did what, when, and for how much. The filter block dominates the first viewport, and on <=380px the row structure visually collapses.

**Директор в быстрой проверке остатков**: Wants to find anomalies fast. Courier cards are visually equal; there is no strong emphasis for large amounts, missing cash, or unusual balances.

#### Minor Observations

- Bottom navigation buttons have accessible names, but no visible labels in the DOM. This may be a deliberate icon-only app-shell choice, but it weakens recognition for `Остатки` vs `История`.
- Money in operation history detail/audit correctly remains exact with `.00`; do not apply compact rubles there without a separate decision.
- The overall palette is restrained and appropriate. This critique does not recommend adding more color before fixing layout.

#### Questions to Consider

- Should `История` open as a feed first, with filters secondary, or is filtering the primary workflow?
- Is `Остатки -> Курьеры` meant to compare couriers, or inspect one courier at a time?
- Should director stock rows be optimized for totals first, with product details one tap deeper?
