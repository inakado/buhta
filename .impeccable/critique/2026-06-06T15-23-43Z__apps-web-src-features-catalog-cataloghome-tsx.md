---
target: экран каталог
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-06T15-23-43Z
slug: apps-web-src-features-catalog-cataloghome-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2.5 | Loading exists, but mutation progress/success is weak and not tied to the affected row. |
| 2 | Match System / Real World | 3 | Domain labels are mostly clear, but `Шаблоны` and `Номенклатура` are less concrete than the actual work. |
| 3 | User Control and Freedom | 2.5 | Create/edit can be cancelled, archive can be restored only after switching context. |
| 4 | Consistency and Standards | 2.5 | Reuses project primitives, but tabs use custom button semantics and the section structure repeats labels. |
| 5 | Error Prevention | 2 | Product template dependencies are guarded, but archive is one-click and edit fields can submit weak values. |
| 6 | Recognition Rather Than Recall | 3 | Four catalog areas are visible, but no per-tab counts or current scope summary. |
| 7 | Flexibility and Efficiency | 2 | No search, no quick filtering, no shortcuts, and growing lists will become slow to scan. |
| 8 | Aesthetic and Minimalist Design | 2.5 | Dense and mostly restrained, but headings, tabs, archive header, and row actions create extra layers. |
| 9 | Error Recovery | 2 | Inline errors exist, but no undo/success affordance after archive/update. |
| 10 | Help and Documentation | 2 | A dependency hint exists for product templates, but price/unit expectations are otherwise implicit. |
| **Total** | | **24/40** | **Usable but structurally noisy** |

## Anti-Patterns Verdict

**LLM assessment**: The catalog does not look like decorative AI slop. It is practical, restrained, and mostly in the product UI register. The problem is not visual gimmickry, it is operational friction: repeated headings, a heavy tab/header/list stack, one-click archive actions, and row controls that will become cramped on mobile.

**Deterministic scan**: `detect.mjs` returned `[]` for `apps/web/src/features/catalog/CatalogHome.tsx`. No deterministic slop rules were triggered.

**Visual overlays**: No reliable user-visible overlay is available in this run. `localhost:3000` and `localhost:3001` were not responding, and no dev server was started for this critique.

## Overall Impression

The screen is a functional CRUD settings surface, but it feels like four similar mini-screens stacked behind tabs rather than one confident catalog tool. The biggest opportunity is to reduce repeated structure and make catalog maintenance safer: users should know what they are editing, what will disappear, and how to recover without switching mental context.

## What's Working

- The create form is progressive: it opens only after `Новый`, which keeps the default list view cleaner.
- Rows are not fake cards. `catalog-list-row` is a better pattern for read/edit catalog data than decorative entity cards.
- Product templates correctly guard missing сырье/тара dependencies before creation, which prevents a real invalid workflow.

## Priority Issues

### [P1] Repeated hierarchy makes the screen feel heavier than the task

**Why it matters**: Users see `Справочники`, `Номенклатура`, tab labels, then another section title like `Виды сырья`. On a small screen this pushes the actual list down and makes the UI feel more complex than the work.

**Fix**: Keep one screen heading and the tabs. Make the active tab carry the context. Either remove the secondary section heading or turn it into a compact row with count + primary action only.

**Suggested command**: `$impeccable distill экран каталог`

### [P1] Archive is too easy for a destructive state change

**Why it matters**: `В архив` is a one-click row action. The item disappears from the active list, and recovery requires switching to archive. For production templates this can disrupt downstream operations and feels too casual.

**Fix**: Add a lightweight inline confirmation or undo notice after archive. Keep restore obvious in archive mode. For product templates, phrase the action as a state transition, not a delete-like action.

**Suggested command**: `$impeccable harden экран каталог`

### [P2] Mobile row actions will dominate the content

**Why it matters**: Rows use `grid-template-columns: minmax(0, 1fr) auto`, with a text archive button and edit icon on the right. On 320-430px, long names plus `В архив` can make actions visually louder than the catalog value.

**Fix**: On narrow screens, keep name/unit/price in the first row and move actions to a compact second row, or collapse secondary row actions behind a small menu if archive becomes confirmed.

**Suggested command**: `$impeccable adapt экран каталог на 320-430px`

### [P2] Product template form has high cognitive load for an inline panel

**Why it matters**: Creating a product template requires name, сырье, тара, price, dependency state, and error handling. Inline form placement is okay, but all fields have equal weight and no clear grouping.

**Fix**: Split the form visually into `Название`, `Состав`, `Цена`, with tighter spacing and clearer disabled reason. Keep it inline, not a modal.

**Suggested command**: `$impeccable layout форма шаблона продукции`

### [P2] Catalog will not scale past short lists

**Why it matters**: There is no search, count by tab, or quick way to find a specific template/distributor. This is fine for seed data but weak for real CRM usage.

**Fix**: Add a small search/filter row per active tab and show active/archive counts without making another heavy header.

**Suggested command**: `$impeccable shape каталог: поиск и плотный список`

## Persona Red Flags

**Nikita, директор**: Wants to quickly check or adjust a catalog item from `Еще → Каталог`. He has to parse `Справочники`, `Номенклатура`, tab labels, then a repeated section heading before acting. The path is understandable, but the hierarchy is noisier than needed for a rare administrative task.

**Операционный администратор**: Maintains many product templates. Without search or counts, she must scan the full active list and switch archive mode to recover a mistaken archive. High risk once lists grow beyond a few items.

**First-time manager**: `Шаблоны` is not self-explanatory enough. It likely means product templates, but the tab label hides whether this is finished products, recipes, sale prices, or production defaults.

## Minor Observations

- `aria-current="page"` on catalog tab buttons works visually, but `role="tablist"` / `role="tab"` would better match the pattern already used elsewhere.
- `Новый` is compact and consistent, but it does not say what will be created. This is acceptable only if the active tab context is unmistakable.
- Product price placeholder `1250.00` is exact-format while the rest of read-only catalog prices use compact formatting. That is probably correct for input, but it increases visual mismatch.
- The archive header stacks on mobile at `max-width: 520px`, which may add vertical height before the list.

## Questions to Consider

- What if the active tab were the only context label, and the section title disappeared entirely?
- Should archive behave like a reversible state change with undo, rather than an immediate disappearance?
- Does `Шаблоны` need to become `Продукция` or `Шаблоны продукции` in the tab, even if it is longer?
