---
name: "Бухта CRM"
description: "Спокойная mobile-first PWA CRM для учета продукции, продаж, наличных и проверяемой истории операций."
colors:
  brand-green: "#4AB855"
  brand-lime: "#E8FBCB"
  base-black: "#000000"
  base-white: "#FFFFFF"
  surface-action: "#EFF1EE"
  surface-stock: "#FBFCFB"
  surface-muted: "#F2F4F1"
  line: "#E3E8E2"
  text-muted: "#66706A"
  success-ink: "#25772D"
  error-bg: "#FFE9E9"
  error-ink: "#A51616"
  warning-bg: "#FFF6D8"
  warning-ink: "#7A5600"
typography:
  display:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "42px"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "0"
  headline:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "0"
  title:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "0"
  body:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0"
  label:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "0"
  metricOverview:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0"
  metricStrip:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0"
  metricDense:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "0"
  controlTable:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0"
rounded:
  control: "8px"
  panel: "14px"
  settings: "18px"
  summary: "24px"
  shell: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "16px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.base-black}"
    textColor: "{colors.base-white}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "48px"
    typography: "{typography.body}"
  button-secondary:
    backgroundColor: "{colors.base-white}"
    textColor: "{colors.base-black}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "38px"
    typography: "{typography.label}"
  input-field:
    backgroundColor: "{colors.surface-stock}"
    textColor: "{colors.base-black}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "46px"
    typography: "{typography.body}"
  form-panel:
    backgroundColor: "{colors.base-white}"
    textColor: "{colors.base-black}"
    rounded: "{rounded.control}"
    padding: "14px"
  summary-card:
    backgroundColor: "{colors.brand-lime}"
    textColor: "{colors.base-black}"
    rounded: "{rounded.summary}"
    padding: "14px"
  metric-summary-strip:
    backgroundColor: "{colors.brand-lime}"
    textColor: "{colors.base-black}"
    rounded: "{rounded.settings}"
    padding: "8px"
    labelTypography: "11px / 1.15"
    valueTypography: "{typography.metricStrip}"
    moneyFormat: "compact rubles, no trailing .00"
  product-quantity-display:
    primary: "net weight in kg"
    secondary: "unit count in шт"
    order: "kg first, units second"
    tableTreatment: "vertical quantity stack: primary kg line, muted unit-count line"
    priceTreatment: "unit price is a separate fact, not part of the quantity string"
  director-control-surface:
    backgroundColor: "{colors.base-white}"
    textColor: "{colors.base-black}"
    borderColor: "{colors.line}"
    rounded: "compact panel radius"
    density: "dense mobile control rhythm"
    typography: "compact titles, labels, tabular values"
  director-stock-ledger:
    backgroundColor: "{colors.base-white}"
    textColor: "{colors.base-black}"
    borderColor: "{colors.line}"
    rounded: "compact panel radius"
    density: "single header, owner rows, light detail rows"
    typography: "11-13px labels and tabular values"
  bottom-nav:
    backgroundColor: "{colors.base-black}"
    textColor: "{colors.base-white}"
    rounded: "{rounded.pill}"
    padding: "8px"
---

# Design System: Бухта CRM

## 1. Overview

**Creative North Star: "Операционный журнал на ладони"**

Дизайн-система «Бухты» строится как спокойный рабочий журнал для повторяющихся операций с товаром и деньгами. Она не продает продукт, не украшает икру и не пытается выглядеть как большая ERP. Она помогает сотруднику быстро увидеть текущий раздел, остаток, сумму, доступное действие и причину блокировки.

Основная поверхность: светлая mobile-app оболочка шириной около 430px, белые рабочие панели, серо-зеленый фон, черная навигация и редкий зеленый акцент для состояния, успеха и активного выбора. Интерфейс должен быть строгим, практичным, спокойным, удобным, плавным и быстрым. Главная Директора после extraction является эталоном контрольной поверхности: плотная, табличная, без декоративных карточек, с небольшими радиусами, тонкими линиями и компактной типографикой. Крупные числа допустимы только для настоящей верхней сводки; обычные формы, списки, вкладки и control screens сохраняют плотность.

**Key Characteristics:**

- Mobile-first PWA shell с нижней навигацией и рабочей плотностью.
- Черный цвет отвечает за основной текст, primary action и активную навигацию.
- Роль пользователя не выводится как постоянная верхняя надпись на каждом экране. Контекст задают нижняя навигация, заголовок текущего раздела и профиль/account-блоки там, где роль действительно нужна.
- Зеленый отвечает за успех, активное состояние и операционный статус, а не за декор.
- Списки, история и справочники строятся как строки с разделителями, без ложных карточек.
- Плавность выражается короткими state transitions и мгновенным feedback, без page-load choreography.

## 2. Colors

Палитра restrained: белый, черный и серо-зеленые поверхности несут основную работу, зеленый и lime используются точечно для состояния, summary и подтверждения.

### Primary

- **Рабочий зеленый**: основной акцент для success states, active badges, online/status и иконок в summary context.
- **Мягкий lime**: светлая поверхность для role summary, notice и success feedback. Это фон состояния, а не общий фон приложения.

### Neutral

- **Черный каркас**: основной текст, bottom nav, primary button, selected segmented state.
- **Белая рабочая поверхность**: формы, панели, popover, dialog и основной mobile shell.
- **Серо-зеленый фон**: body/page background и secondary inactive surfaces.
- **Товарная поверхность**: input fields, quiet panels, detail cells и nested state blocks.
- **Линия учета**: dividers, control borders, list separators and panel borders.
- **Muted text**: labels, captions, timestamps, disabled explanations and secondary details.

### Semantic

- **Success ink**: текст и иконки на lime/success surfaces.
- **Error pair**: red-tinted inline error block and red ink for blocking messages.
- **Warning pair**: yellow-tinted caution block and brown ink for non-fatal warnings.

### Named Rules

**The Green Rarity Rule.** Зеленый не должен занимать весь экран. Он появляется там, где пользователь выбирает, завершает или считывает статус.

**The No Acid Rule.** Запрещен кислотно-зеленый интерфейс и монотонная зеленая палитра. Белый, черный и серо-зеленые нейтрали обязаны балансировать акцент.

## 3. Typography

**Display Font:** Helvetica, Arial, sans-serif.
**Body Font:** Helvetica, Arial, sans-serif.
**Label/Mono Font:** тот же system sans, с `font-variant-numeric: tabular-nums` для денег, количества и KPI.

**Character:** Один системный sans сохраняет скорость и привычность product UI. Иерархия строится размером, весом 400/500/600 и плотностью, а не декоративными шрифтами.

### Hierarchy

- **Display** (500, 42-44px, line-height 0.9-0.95): только большие числа role summary и ключевые остатки.
- **Headline** (500, 25-28px, line-height 1.08-1.1): заголовки экранов вроде `Пользователи` или `Аналитика`.
- **Title** (500, 16-18px, line-height 1.1): section headings, row titles, card titles.
- **Body** (400, 13-15px, line-height 1.2-1.35): form copy, list details, explanations and inline messages.
- **Label** (400, 11-12px, letter-spacing 0): captions, field labels, meta, dates, small button text. Uppercase допустим только для коротких служебных labels.
- **Metric overview** (500, 22px, line-height 1): KPI в компактных summary-зонах, когда число действительно является главным объектом блока.
- **Metric strip** (500, 16px, line-height 1): значения в трехколоночных lime/green summary strips, где деньги и количество должны оставаться в одну строку.
- **Metric dense** (500, 17px, line-height 1.1): значения в двухколоночных compact balance blocks and small analytics panels.
- **Control table** (400, 11-12px, line-height 1.1): строки, подписи, даты и числовые значения в директорских, складских и read-only control surfaces. Это базовый масштаб для плотных мобильных данных.

### Named Rules

**The Density Before Drama Rule.** Не увеличивать шрифт, если проблему можно решить порядком, отступом, divider или коротким текстом.

**The Numbers Must Settle Rule.** Деньги, количество и KPI используют tabular numbers, nowrap там, где это не ломает мобильную ширину, и не становятся декоративными hero metrics.

## 4. Elevation

Система flat-by-default. Глубина создается фоном, divider lines, border and containment. Тени используются только для app shell, floating popover, modal dialog и transient success notice, где нужно отделить слой от текущей работы.

### Shadow Vocabulary

- **App shell ambient** (`box-shadow: 0 18px 60px rgb(0 0 0 / 10%)`): внешний мобильный контейнер на странице.
- **Popover lift** (`box-shadow: 0 14px 38px rgb(0 0 0 / 14%)`): search combobox and option picker floating layer.
- **Dialog lift** (`box-shadow: 0 18px 54px rgb(0 0 0 / 18%)`): operation history modal.
- **Toast lift** (`box-shadow: 0 10px 28px rgb(0 0 0 / 18%)`): success notice above bottom nav.

### Named Rules

**The Ledger Line Rule.** Списки и контрольные экраны получают разделители, а не карточные тени. Если строка read-only, она не должна выглядеть как drill-down card без действия.

**The Floating Layer Rule.** Тень разрешена, когда слой реально плавает над интерфейсом: popover, dialog, toast. На обычной карточке сначала использовать border or tonal surface.

## 5. Components

### Buttons

- **Shape:** primary actions use a full pill (999px), secondary and status controls use a compact control radius (8px).
- **Primary:** black background with white text, inline icon, min-height 48px.
- **Secondary:** white background, line border, black text, min-height 38-42px.
- **State:** disabled actions are visibly disabled; write actions must explain offline or validation block reasons near the submit area.

### Chips

- **Style:** segmented controls use a 2-column grid with 8px gap, white or stock surface by default, black fill when active.
- **State:** selected state is black/white. Do not use green fill for inactive options.

### Cards / Containers

- **Corner Style:** form panels use 8px, analytics panels 14px, settings/admin notices 18px, role summary blocks 24px, outer shell 28px.
- **Background:** white for work panels, `surface-stock` for quiet nested blocks, lime gradients only for role summary or success context.
- **Shadow Strategy:** flat at rest. Shadows are reserved for shell, popover, dialog and toast.
- **Border:** `line` borders and separators are the main structure.
- **Internal Padding:** compact default 12-14px; role summary may use 14-16px.
- **Money formatting:** overview metrics, read-only stock lists, production read-only prices and operation summaries use compact rubles without trailing `.00`; keep kopecks when they are non-zero. Audit/detail views and money inputs keep exact two-decimal formatting.
- **Product quantity display:** готовая продукция отображается как `кг` primary и `шт` secondary. В таблицах остатков запрещен inline-формат `кг + шт`: количество идет вертикальным стеком, где кг получает основной вес, а штуки идут отдельной muted-строкой. Цена за штуку (`₽/шт`) является отдельным фактом и не склеивается с количеством в одну равновесную meta-цепочку. Result/history surfaces должны сохранять тот же порядок `кг` → `шт`, если данные по массе доступны.
- **Distributor stock ledger:** в таблицах `На распределителе` цена за штуку (`₽/шт`) относится к позиции и размещается под наименованием. Колонка `Количество` содержит только физическое количество (`кг` и `шт`), колонка `Итого` содержит только сумму позиции.
- **Workshop product ledger:** экран `Продукция в цеху` использует три смысловые колонки даже на 375px: `Наименование`, `Цена`, `Остаток`. Цена за штуку занимает свободную среднюю колонку и не выводится под остатком, потому что правый блок должен отвечать только за физическое количество.
- **Metric summary strip:** three-column lime/green status strips use 18px radius, 8px outer padding, 7-8px cell padding, 11px labels and 16px tabular values. Money values use compact rubles without trailing `.00`. Do not promote these values to display size on mobile.
- **Director control surface:** the extracted Director home is the reference for future dashboard/control screens. Use white panels, thin ledger borders, restrained radii, dense inner padding, compact section titles, small table labels and tabular values. Do not reintroduce stacked decorative cards, oversized KPI blocks, broad shadows, arbitrary status colors or data duplicated across tabs.
- **Director stock ledger:** `Остатки Директора` extends the control surface standard for stock screens. Keep a fixed topbar with embedded segmented tabs, one compact summary strip, then white ledger panels. Owner rows such as distributor or courier are stronger than product detail rows. Table labels appear once per panel or section, not under every entity. Use tonal separators and thin lines to separate owners instead of nested cards.

### Inputs / Fields

- **Style:** 46px minimum height, 8px radius, `surface-stock` background, `line` border, black text.
- **Focus:** retain visible focus treatment; icon buttons already use green focus outline where implemented.
- **Error / Disabled:** inline errors use red tint; disabled state reduces opacity and blocks write actions without pretending success.

### Navigation

- **Style:** bottom nav is a black pill fixed inside the mobile shell, with white icons/text and white active pill.
- **Typography:** 12px medium labels with ellipsis protection.
- **Mobile treatment:** navigation sits above the bottom safe area; long screens need bottom padding so final rows and forms do not hide behind it.

### Search Combobox

Search combobox uses Radix Popover, opens on focus, previews first 3 options, renders `listbox/option`, and uses a floating white panel with 8px radius and popover lift. Options are dense rows with strong title, muted meta and gray-green hover/focus surface.

### Data Rows

Clients, catalog, courier products, recent sales and operation history prefer compact rows with dividers. Use cards only when the component is an actual form, edit mode, summary or floating layer.

### Dashboard / Control Surfaces

Director home defines the product's dashboard language. A dashboard is not a landing page and not a collection of equal cards. It is a control surface with a small number of semantic zones:

- **Top summary first:** money, stock or production headline facts live at the top and are not repeated in tabs below.
- **Segmented context:** period controls and internal tabs use the same segmented vocabulary, with active white fill on muted surface when embedded into an analytics panel.
- **One rhythm per panel:** overview, chart and table content share the same inner padding, title scale, label scale, row scale and divider style.
- **Rows over cards:** read-only data uses rows, table headers and dividers. Cards are reserved for the outer panel or true summaries.
- **Owner/detail separation:** when a stock table groups data by owner, the owner row carries name and aggregate values, while product rows below carry detail values without repeating the same labels.
- **Facts only:** dashboards show measured facts from API/read models. No plans, fake statuses, invented interpretations or decorative "health" labels.
- **Compact charts:** charts are allowed when they answer a specific question and stay visually subordinate to the accounting data. Prefer local SVG for a single lightweight series; add a chart library only for multi-series interaction, tooltips or deeper exploration.
- **Responsive compression:** narrow mobile widths compress through local tokens and shorter labels, not by letting text overlap or by scaling fonts fluidly.

### Selector / Token Architecture

The design system migration is intentional and incremental. Screens may keep isolated local selectors while the system is being extracted, but they must map back to the shared visual language.

- **Isolated by screen:** complex surfaces use a stable screen prefix, such as `director-dashboard-*`, so local polish cannot leak into other roles.
- **Shared standards underneath:** local selectors should reuse the same font scale, tab treatment, button vocabulary, spacing rhythm, line color and state colors defined here or in shared primitives.
- **No screen-local inventions by default:** new radius, font sizes, shadows, action blocks or button styles need a reason. If the intent already exists, reuse or extend the standard.
- **Extract after repetition:** when a local pattern appears across multiple screens with the same intent, promote it to a shared primitive or documented token instead of copying CSS.
- **Command surfaces:** action blocks, compact command buttons and role-specific summary strips now follow the same white ledger/control language. Keep screen-local selectors only when they encode a role-specific layout, not a new visual treatment.

## 6. Do's and Don'ts

### Do:

- **Do** keep the product register: familiar controls, consistent affordances, restrained color and dense but readable screens.
- **Do** use `#000000` for primary action, selected states and bottom nav.
- **Do** use `#4AB855` and `#E8FBCB` as state accents, not decorative wash.
- **Do** keep forms short, with clear block reasons for offline, loading, missing selection, invalid quantity and permission problems.
- **Do** preserve row-based read-only lists with `#E3E8E2` dividers.
- **Do** keep touch targets comfortable without making every element oversized.
- **Do** use tabular numbers for money, quantity and KPI values.
- **Do** use the Director home control surface as the migration target when replacing old dashboard, analytics, stock and read-only report screens.

### Don't:

- **Don't** make this a SaaS-лендинг or marketing витрина.
- **Don't** turn it into a банковский dark dashboard.
- **Don't** imitate a перегруженная ERP with noisy tables on every mobile screen.
- **Don't** use декоративная премиальная витрина про икру as a visual metaphor.
- **Don't** build a кислотно-зеленый интерфейс or монотонная зеленая палитра.
- **Don't** let карточки, тени, градиенты и анимации become more important than accounting товар, деньги and actions.
- **Don't** over-enlarge controls: touch targets must stay usable, but density is part of the product.
- **Don't** create new screen-local visual tokens when the Director control surface already defines the needed rhythm.
- **Don't** use side-stripe borders, gradient text, glassmorphism, ghost-card border plus large shadow, or 32px+ radii on ordinary cards.
