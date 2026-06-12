# Post-Submit Result Layers

Статус: `Completed`
Дата: `2026-06-12`

## 1. Цель

Заменить transient success toast/notice на проверяемый inline result layer в операциях, где пользователь меняет деньги, товарные остатки, выпуск, загрузку, возврат, списание, дисконт или отмену продажи.

Пользователь после успешной записи должен видеть не просто “готово”, а что именно записано: объект операции, сумму или количество, участника, время, связанный журнал/operation id там, где это полезно для сверки, и понятные следующие действия.

## 2. Scope

- Ввести общий frontend pattern `Post-Submit Result Layer` для операционных экранов.
- Покрыть `P1` операции:
  - продажа с распределителя;
  - продажа курьера, включая cleanup уже внедренного flow;
  - загрузка курьера;
  - возврат курьера;
  - выпуск продукции;
  - передача продукции на распределитель;
  - списание наличных директором/администратором;
  - назначение дисконта;
  - отмена продажи из истории продаж.
- При замене success toast/notice на result layer удалять старый toast внизу или локальную success строку для этой операции.
- Сохранить inline error states, pending states, offline blocking и query invalidation.
- Обновить web tests на новые result states и отсутствие старых toast.

## 3. Out Of Scope

- Backend/domain-инварианты, транзакции, idempotency и audit schema не меняются.
- Новые API endpoints для прямого перехода к конкретной записи журнала не добавляются, если текущих response payload хватает.
- Экспорт, печать, PDF/чек и отправка клиенту не входят в этот план.
- Полный редизайн форм продажи/загрузки/возврата не входит, меняется только post-submit state.
- Offline write queue и background sync не входят.

## 4. Анализ Экранов И Действий

### Must: result layer обязателен

1. `features/sales/DistributorSaleHome.tsx`
   - Действие: `POST /distributor/sales`.
   - Сейчас: после успеха форма очищается, active tab уходит на `home`, global bottom `success-notice`: `Продажа записана`.
   - Нужно: остаться на экране `Продажа`, показать `Записано`: клиент, продукция, количество, цена, оплата, итог, распределитель, время. Actions: `Готово` на главный экран без toast, `Новая продажа`.

2. `features/courier/CourierSaleHome.tsx`
   - Действие: `POST /courier/sales`.
   - Сейчас: inline result layer уже есть, но `Готово` не должен вызывать старый bottom toast.
   - Нужно: закрепить текущий layer как reference implementation, убрать дублирующий toast, затем извлечь общий reusable pattern.

3. `features/courier/CourierLoadHome.tsx`
   - Действие: `POST /courier/loads`.
   - Сейчас: `onLoadSuccess()` возвращает на home и показывает `Загрузка записана`.
   - Нужно: `Записано`: откуда, продукция, количество, цена, стоимость, новый остаток курьера/распределителя, время. Actions: `Готово`, `Новая загрузка`.

4. `features/courier/CourierUnloadHome.tsx`
   - Действие: `POST /courier/unloads`.
   - Сейчас: `onUnloadSuccess()` возвращает на home и показывает `Возврат записан`.
   - Нужно: `Записано`: куда вернули, товарные строки, наличные, общий товарный эквивалент, новый cash balance распределителя/курьера, время. Actions: `Готово`, `Новый возврат`.

5. `features/production/ProductionHome.tsx`, `ProductBatchForm`
   - Действие: `POST /production/product-batches`.
   - Сейчас: форма сбрасывается, production screen возвращается home, локальный `ProductionSuccessNotice`: `Выпуск записан`.
   - Нужно: `Записано`: продукция, количество, расход сырья, расход тары, цена за единицу, время. Actions: `Готово`, `Новый выпуск`.

6. `features/production/ProductionHome.tsx`, `ProductTransferForm`
   - Действие: `POST /production/product-transfers`.
   - Сейчас: форма сбрасывается, production screen возвращается home, локальный notice: `Передано на распределитель`.
   - Нужно: `Записано`: продукция, распределитель, количество, цена, стоимость, остаток в цеху/на распределителе из response, время. Actions: `Готово`, `Новая передача`.

7. `features/distributor/DistributorInventoryHome.tsx`, cash withdrawal dialog
   - Действие: `POST /distributor/cash-withdrawals`.
   - Сейчас: dialog закрывается, появляется `success-inline`: `Наличные списаны`.
   - Нужно: после submit показывать result layer вместо формы dialog или inline under action: распределитель, списано, остаток наличных после, время. Actions: `Готово`, `Списать еще`.

8. `features/distributor/DistributorInventoryHome.tsx`, discount dialog
   - Действие: `POST /distributor/discounts`.
   - Сейчас: dialog закрывается, появляется `success-inline`: `Цена снижена`.
   - Нужно: result layer: продукция, количество, старая цена, новая цена, скидка за единицу, общая скидка, оставшаяся исходная строка, созданная дисконтная строка, время. Actions: `Готово`, `Снизить еще`.

9. `features/sales/SalesHistoryHome.tsx`
   - Действие: `POST /distributor/sales/:id/cancel`, `POST /courier/sales/:id/cancel`.
   - Сейчас: после confirmation dialog показывается inline `Продажа отменена`.
   - Нужно: result strip над историей или на месте cancel dialog: продажа отменена, клиент, продукция, количество, сумма, причина, кто отменил, восстановленный товарный/cash effect из response, время. Actions: `Готово`, `К истории`.

### Should: рассмотреть после P1

1. `ProductionHome.tsx`, `IntakeForm` для сырья и тары.
   - Меняет производственные балансы, но не деньги и не готовую продажную продукцию.
   - Рекомендация: после P1 добавить легкий result layer или оставить local notice, если ручная проверка покажет, что приход сырья/тары не требует сверки сразу после submit.

2. `NotificationsHome.tsx`.
   - Создание и выполнение задач пишет audit, но не меняет деньги/остатки.
   - Рекомендация: оставить inline success notice, потому что пользователь сразу видит задачу в списке.

### Keep toast/notice: result layer не нужен

- `ClientsHome.tsx`: создание/редактирование клиента, кроме inline создания клиента внутри продажи. Это справочная операция; текущий notice достаточно.
- `CatalogHome.tsx`: CRUD справочников и архивирование. Оставить section notice.
- `AdminUsersHome.tsx`: copy login, смена роли, редактирование пользователя. Для временного пароля уже есть устойчивый notice layer, это не transient toast.
- `AccountMoreSection` и смена собственного пароля: оставить account success notice.
- Copy actions: телефон клиента, login, временный пароль. Это не учетная запись операции.

## 5. UX Решения

- Result layer inline, не modal by default. Он заменяет форму или форму внутри уже открытого dialog, чтобы пользователь не потерял контекст действия.
- Заголовок: `Записано` для create/transfer/write-off/discount, `Продажа отменена` для cancellation.
- Структура:
  - success header с временем операции;
  - ledger rows с business details;
  - optional compact technical row `Операция #...` только если ссылка на историю реально доступна и не засоряет mobile UI;
  - две primary actions per flow.
- Actions:
  - частые повторяемые операции получают `Готово` + `Новая ...`;
  - списание и дисконт получают `Готово` + повтор действия;
  - отмена продажи получает `Готово` + `К истории`.
- Старый bottom/global toast не показывать после `Готово`, если пользователь уже видел result layer.
- Error states остаются в форме, result layer появляется только после confirmed server success.
- Данные result layer строить из response payload plus stable local snapshot выбранных labels до submit. Не показывать сырые internal ids как основной текст.

## 6. Затронутые Документы

- `docs/FRONTEND.md`
- `docs/DOCS-INDEX.md`
- `docs/exec-plans/active/2026-06-12-post-submit-result-layers.md`

После завершения плана обновить `docs/FRONTEND.md` фактическим списком покрытых операций и перенести этот файл в `docs/exec-plans/completed/`.

## 7. Затронутые Модули И Файлы

- `apps/web/src/app-shell/RoleHomeRouter.tsx`
- `apps/web/src/app-shell/AppRoot.tsx`
- `apps/web/src/features/courier/CourierSaleHome.tsx`
- `apps/web/src/features/courier/CourierLoadHome.tsx`
- `apps/web/src/features/courier/CourierUnloadHome.tsx`
- `apps/web/src/features/sales/DistributorSaleHome.tsx`
- `apps/web/src/features/sales/SalesHistoryHome.tsx`
- `apps/web/src/features/production/ProductionHome.tsx`
- `apps/web/src/features/distributor/DistributorInventoryHome.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/page.test.tsx`

Вероятный новый shared UI/helper:

- `apps/web/src/features/operations/PostSubmitResultLayer.tsx`
- `apps/web/src/features/operations/post-submit-result.ts`

## 8. API/Contracts Changes

На первом проходе API менять не планируется: текущие responses уже содержат `operationId`, `createdAt`, суммы, количества и affected balances для большинства P1 операций.

Проверить при реализации:

- cancellation result labels берутся из выбранной строки history до submit, потому response не содержит client/product labels в явном user-facing виде;
- production batch response содержит `productBatch`, но affected raw/packaging balances для result layer можно брать из submitted snapshot и invalidated read model;
- если “Открыть в истории” понадобится как action, нужен отдельный route/query contract для deep-link operation history. В этот план это не входит.

## 9. Шаги Реализации

1. Cleanup текущей курьерской продажи:
   - `Готово` переводит на home без global `success-notice`;
   - тест проверяет отсутствие `Продажа записана` после result layer.
2. Extract reusable result layer:
   - общий header/icon/date;
   - ledger rows;
   - two-action footer;
   - responsive/mobile CSS без вложенных карточек.
3. Перевести продажи:
   - вынести общую sale result snapshot модель;
   - применить к distributor sale и courier sale;
   - убрать `onActionSuccess("Продажа записана")` для обоих replaced flows.
4. Перевести courier load/unload:
   - сохранить local snapshot до submit;
   - показать result layer из response plus snapshot;
   - убрать bottom toasts `Загрузка записана` и `Возврат записан`.
5. Перевести production release/transfer:
   - не возвращать на home сразу после submit;
   - показать result layer на detail screen;
   - `Готово` возвращает production home без local success notice.
6. Перевести cash withdrawal/discount:
   - после success заменить содержимое dialog или показать inline result layer рядом с action;
   - убрать `successMessage` для этих операций.
7. Перевести sale cancellations:
   - сохранять snapshot отменяемой продажи;
   - после success показать result strip и не показывать `Продажа отменена` как обычный success notice.
8. Обновить docs/tests:
   - `docs/FRONTEND.md`;
   - `docs/DOCS-INDEX.md`;
   - web scenario tests for result layers and absence of old toasts.

## 10. Тестовый План

- Web tests:
  - distributor sale shows result layer and no bottom `Продажа записана`;
  - courier sale keeps result layer and no bottom `Продажа записана`;
  - courier load result layer and no `Загрузка записана`;
  - courier unload result layer and no `Возврат записан`;
  - production release result layer and no `Выпуск записан`;
  - product transfer result layer and no `Передано на распределитель`;
  - cash withdrawal result layer and no `Наличные списаны`;
  - discount result layer and no `Цена снижена`;
  - sale cancellation result strip and no bare `Продажа отменена`.
- Manual mobile smoke:
  - 390px viewport for each P1 flow;
  - long labels, long client phone, discounted product row, cashless/cash branches;
  - result layer does not overlap bottom nav/safe area;
  - `Готово` and repeat action keep expected navigation and query refresh.
- Required verification:
  - `pnpm --filter @buhta/web test`
  - `pnpm --filter @buhta/web typecheck`
  - `pnpm --filter @buhta/web lint`
  - `pnpm docs:check`
  - broader checks if shared/API contracts change.

## 11. Риски И Rollback

- Risk: result layer built from stale local labels can diverge from backend response.
  - Mitigation: store local labels only for display names missing from response, use response for amounts, quantities, balances and timestamps.
- Risk: removing global toast can make low-stakes actions feel silent.
  - Mitigation: only remove toast for flows with visible result layer; keep notices for clients, catalog, admin copy/actions and notifications.
- Risk: result layer adds too much friction to frequent operations.
  - Mitigation: two actions only, repeat action stays one tap away.
- Risk: dialog-based actions can become cramped if result layer is too detailed.
  - Mitigation: compact ledger in dialog, detailed optional fields omitted on mobile unless needed for verification.
- Rollback: each operation can be reverted independently to its previous success handler while keeping the shared component unused.

## 12. Открытые Вопросы

- `Открыть в истории` не включено в этот этап, потому operation history пока не имеет deep-link на конкретный operation id.
- Приходы сырья/тары оставлены на compact success notice: они не входят в P1 денег/готовой продукции и остаются low-friction производственными вводами.
- Cash withdrawal и discount показывают result layer внутри dialog, чтобы сохранить контекст действия и не прыгать по экрану остатков.

## 13. Выполнено

- Добавлен общий `PostSubmitResultLayer` для операционных result states.
- На result layer переведены:
  - продажа с распределителя;
  - продажа курьера;
  - загрузка курьера;
  - возврат курьера;
  - выпуск продукции;
  - передача продукции на распределитель;
  - списание наличных;
  - назначение дисконта;
  - отмена продажи.
- Старые success toast/notice для этих замененных операций удалены.
- Сохранены compact notices для клиентов, каталога, admin/user actions, задач и приходов сырья/тары.
- `docs/FRONTEND.md` обновлен по фактическому поведению.

## 14. Выполненные Проверки

- `pnpm --filter @buhta/web test`
- `pnpm --filter @buhta/web typecheck`
- `pnpm --filter @buhta/web lint`
- `pnpm docs:check`
