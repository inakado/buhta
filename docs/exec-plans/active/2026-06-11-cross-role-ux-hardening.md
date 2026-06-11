# Cross-role UX Hardening

Статус: `Active`
Дата: `2026-06-11`

## 1. Цель

Закрыть обязательный v1 hardening после миграции frontend на новую дизайн-систему: пользователь должен уметь сменить собственный пароль, администратор должен безопасно работать со списком пользователей, а mobile/PWA shell должен быть проверен на длинных рабочих экранах без перекрытий bottom nav, клавиатурой и safe-area.

## 2. Scope

- UX-001: self-service смена собственного пароля для всех ролей.
- UX-006: эффективность и защита админского списка пользователей:
  - поиск по имени и login;
  - фильтр по роли;
  - copy login;
  - защита от ошибочной смены роли через confirmation или undo/success notice.
- UX-013: mobile smoke длинных экранов:
  - пользователи;
  - история операций;
  - история продаж;
  - клиенты;
  - каталог;
  - аналитика;
  - модалки фильтров, отмены, создания и подтверждения;
  - success notices относительно bottom nav.
- PWA/mobile completion basics:
  - manifest/icon/theme verification;
  - loading/splash behavior;
  - safe-area behavior;
  - offline read-only behavior and existing offline write blocking.

## 3. Out Of Scope

- Public reset password, email recovery and external notifications.
- Offline write queue, background sync and push notifications.
- Reports/control pack: export/print, discount analytics, product/client/cash reports and commercial analytics slice.
- Desktop/tablet expansion for history, analytics and admin lists.
- Complex permissions matrix UI, multi-tenant settings, user import/export.

## 4. Затронутые Документы

- `docs/FRONTEND.md`
- `docs/SECURITY.md`
- `docs/HANDLER-MAP.md`
- `docs/exec-plans/deferred-roadmap.md`
- `docs/DOCS-INDEX.md`

Постоянные auth/security решения после реализации переносить в `docs/SECURITY.md`, frontend conventions и mobile/PWA checklist — в `docs/FRONTEND.md`.

## 5. Затронутые Модули

- `packages/shared/src/**` for password/change-user contracts if needed.
- `apps/api/src/users/**` for own password change endpoint/service.
- `apps/api/src/auth/**` if session invalidation or current-user auth behavior changes.
- `apps/web/src/app-shell/**` for account/profile entry points.
- `apps/web/src/roles/*/*MoreHome.tsx` for cross-role account surfaces.
- `apps/web/src/features/users/AdminUsersHome.tsx` for admin list search/filter/copy/role safety.
- `apps/web/app/**` and PWA assets for manifest, loading and shell verification.
- `apps/web/app/globals.css` for safe-area and long-list spacing fixes.

## 6. Шаги Реализации

1. Audit current auth/profile/account surfaces:
   - where each role reaches `Еще` / account;
   - current admin reset password behavior;
   - existing API user service and BetterAuth session behavior.
2. Implement self password change:
   - define request/response contract;
   - require current password;
   - validate new password and confirmation;
   - return user-facing errors without leaking auth internals;
   - keep the current session active after successful change, because the user has just re-authenticated with the current password.
3. Add cross-role UI entry:
   - use the existing `Еще` / account pattern;
   - modal dialog or compact account surface consistent with Director/Admin `Еще`;
   - visible loading, error and success states.
4. Harden admin users:
   - add local or backend-backed search depending on current `/users` volume and contract;
   - add role filter;
   - add copy login;
   - add confirmation or undo/success notice for role changes.
5. PWA/mobile basics:
   - verify manifest, app icon, theme color and loading screen;
   - verify offline read-only state and write blocking copy;
   - fix safe-area/bottom nav overlap found during smoke.
6. Mobile smoke pass:
   - test the listed long screens at narrow mobile width, including `390px+`;
   - check final rows, modal scroll, textarea/input focus and success notices.
7. Cleanup:
   - remove obsolete selectors or duplicated account/admin code;
   - update docs and tests;
   - commit after successful verification.

## 7. Тестовый План

- Shared contract tests for new password/change-user schemas if added.
- API controller/service tests for password change:
  - happy path;
  - wrong current password;
  - weak/invalid new password;
  - unauthenticated request;
  - session behavior after success if it changes.
- Web tests for:
  - cross-role account entry and password change UI;
  - admin users search, role filter and copy login;
  - role-change confirmation/undo behavior.
- `pnpm --filter @buhta/shared test`
- `pnpm --filter @buhta/api test` or targeted API tests outside sandbox when real Postgres integration is involved.
- `pnpm --filter @buhta/web test -- page.test.tsx`
- `pnpm --filter @buhta/web typecheck`
- `pnpm --filter @buhta/api typecheck`
- `pnpm --filter @buhta/web lint`
- `pnpm --filter @buhta/api lint`
- `pnpm docs:check`
- Browser/mobile smoke for the listed long screens and PWA basics.

## 8. Риски И Rollback

- Password flow can accidentally weaken auth if it bypasses current password verification. Mitigation: service-level verification and targeted API tests.
- Role-change safety can slow admin work if every change is too heavy. Mitigation: use confirmation only for critical changes or undo/success notice with clear feedback.
- PWA/safe-area fixes can affect all roles. Mitigation: test representative long screens and forms before commit.
- Rollback: revert the password endpoint/UI and admin user enhancements separately; safe-area CSS changes should be isolated and easy to revert.

## 9. Открытые Вопросы

- Role change uses explicit confirmation before applying, because the action changes user access.
- Admin user search/filter remains client-side for v1, because the current `/users` contract returns the active employee list without pagination.

## 10. Уточнение Backend Password Flow

- Endpoint: `POST /account/password`.
- Access: any authenticated CRM user; не требует `users.manage`.
- Request validates `currentPassword`, `newPassword`, `newPasswordConfirmation`.
- New password policy: 8–128 characters, at least one lowercase latin letter, one uppercase latin letter and one digit.
- Backend verifies the current credential hash before writing a new hash; UI validation is only a convenience layer.
- Current session remains active after success.
- Audit: append-only `user.password.change`, without plaintext password, token or hash in details.

## 11. Progress

### 2026-06-11 — Self Password Change

- Реализован shared contract, backend endpoint `POST /account/password`, service-level credential hash verification and frontend account dialog.
- Смена пароля доступна из `Еще → Аккаунт` для всех ролей, кроме offline состояния.
- Текущая сессия остается активной после успешной смены пароля.
- Audit action `user.password.change` добавлен в operation history mapping and handler map.
- Следующие подпункты плана остаются open: PWA/mobile smoke basics.

### 2026-06-11 — Admin Users Hardening

- UX-006 закрыт в `features/users/AdminUsersHome.tsx`.
- Добавлены client-side поиск по имени/login и фильтр роли над access-list.
- В строке сотрудника добавлен copy login action с global success notice без перехода на другой экран.
- Смена роли переведена на confirmation dialog: select больше не вызывает PATCH сразу.
- Подтвержденная смена роли обновляет `["users"]` и показывает global success notice `Роль изменена`.
- На ширинах 390+ строка списка остается читаемой: mobile layout переводит identity и controls в одну колонку без обрезки select и icon buttons.
