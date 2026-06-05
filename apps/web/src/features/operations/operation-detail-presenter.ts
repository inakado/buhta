import type { OperationHistoryItem } from "@buhta/shared";
import { ROLE_LABELS } from "../../lib/role-labels";

export type OperationDetailTone = "default" | "muted" | "positive" | "warning";

export type OperationDetailRow = {
	label: string;
	value: string;
	tone?: OperationDetailTone;
};

export type OperationDetailSection = {
	title: string;
	rows: OperationDetailRow[];
};

export type OperationDetailPresentation = {
	title: string;
	description: string;
	summary: OperationDetailRow[];
	sections: OperationDetailSection[];
};

const OPERATION_LABELS: Record<string, string> = {
	"catalog.distributor.archive": "Архивация распределителя",
	"catalog.distributor.create": "Создание распределителя",
	"catalog.distributor.update": "Обновление распределителя",
	"catalog.packaging_type.archive": "Архивация тары",
	"catalog.packaging_type.create": "Создание тары",
	"catalog.packaging_type.update": "Обновление тары",
	"catalog.product_template.archive": "Архивация продукции",
	"catalog.product_template.create": "Создание продукции",
	"catalog.product_template.update": "Обновление продукции",
	"catalog.raw_material_type.archive": "Архивация сырья",
	"catalog.raw_material_type.create": "Создание сырья",
	"catalog.raw_material_type.update": "Обновление сырья",
	"client.create": "Создание клиента",
	"client.update": "Обновление клиента",
	"courier.sale.cancel": "Отмена продажи курьера",
	"courier.sale.create": "Продажа курьера",
	"courier.stock.load.create": "Загрузка курьера",
	"courier.unload.create": "Возврат курьера",
	"distributor.cash.withdraw": "Списание наличных",
	"distributor.discount.assign": "Назначение дисконта",
	"distributor.sale.cancel": "Отмена продажи",
	"distributor.sale.create": "Продажа",
	"foundation.baseline": "Проверочная операция",
	"production.notification.complete": "Задача выполнена",
	"production.notification.create": "Задача производству",
	"production.packaging_intake.create": "Поступление тары",
	"production.product_batch.create": "Выпуск продукции",
	"production.product_transfer.create": "Передача продукции",
	"production.raw_material_intake.create": "Поступление сырья",
	"user.create": "Создание пользователя",
	"user.password.reset": "Сброс пароля",
	"user.role.update": "Смена роли",
};

const ENTITY_LABELS: Record<string, string> = {
	client: "Клиент",
	courier_load: "Загрузка курьера",
	courier_sale: "Продажа курьера",
	courier_sale_cancellation: "Отмена продажи курьера",
	courier_unload: "Возврат курьера",
	distributor: "Распределитель",
	distributor_cash_withdrawal: "Списание наличных",
	distributor_sale: "Продажа",
	distributor_sale_cancellation: "Отмена продажи",
	packaging_intake: "Прием упаковки",
	packaging_type: "Тип упаковки",
	product_batch: "Партия",
	product_discount_assignment: "Дисконт",
	product_template: "Товар",
	product_transfer: "Передача продукции",
	production_notification: "Задача производству",
	raw_material_intake: "Прием сырья",
	raw_material_type: "Тип сырья",
	user: "Пользователь",
};

const DETAIL_LABELS: Record<string, string> = {
	action: "Действие",
	active: "Активен",
	amountCents: "Сумма",
	baseUnitPriceCents: "Базовая цена",
	cashAmountCents: "Наличными",
	cashBalanceAfter: "Наличные после",
	cashBalanceBefore: "Наличные до",
	clientName: "Клиент",
	comment: "Комментарий",
	completedByName: "Исполнитель",
	consumedPackagingQuantity: "Расход тары",
	consumedRawMaterialQuantity: "Расход сырья",
	courierLogin: "Курьер",
	courierName: "Курьер",
	createdByName: "Создал",
	description: "Описание",
	discountCentsPerUnit: "Скидка за единицу",
	discountedQuantityAfter: "Дисконтированный остаток после",
	discountedQuantityBefore: "Дисконтированный остаток до",
	discountedUnitPriceCents: "Новая цена",
	discountTotalCents: "Сумма скидки",
	distributorBalanceAfter: "Остаток распределителя после",
	distributorBalanceBefore: "Остаток распределителя до",
	distributorCashBalanceAfter: "Наличные распределителя после",
	distributorCashBalanceBefore: "Наличные распределителя до",
	distributorName: "Распределитель",
	fromRole: "Было",
	login: "Логин",
	message: "Текст задачи",
	name: "Название",
	packagingTypeName: "Тара",
	packagingUnit: "Единица тары",
	paymentMethod: "Оплата",
	phone: "Телефон",
	priceCents: "Цена",
	productName: "Продукция",
	quantity: "Количество",
	rawMaterialTypeName: "Сырье",
	rawMaterialUnit: "Единица сырья",
	reason: "Причина",
	recipientRole: "Получатель",
	sourceQuantityAfter: "Исходный остаток после",
	sourceQuantityBefore: "Исходный остаток до",
	sourceUnitPriceCents: "Текущая цена",
	status: "Статус",
	statusAfter: "Статус после",
	statusBefore: "Статус до",
	stepDiscountCentsPerUnit: "Снижение на этом шаге",
	stockBalanceAfter: "Остаток товара после",
	stockBalanceBefore: "Остаток товара до",
	stockValueCents: "Стоимость",
	toRole: "Стало",
	totalCents: "Итого",
	unit: "Единица",
	unitPriceCents: "Цена",
	workshopBalanceAfter: "Остаток цеха после",
	workshopBalanceBefore: "Остаток цеха до",
};

const MONEY_DETAIL_KEYS = new Set([
	"amountCents",
	"baseUnitPriceCents",
	"cashAmountCents",
	"cashBalanceAfter",
	"cashBalanceBefore",
	"courierCashBalanceAfter",
	"courierCashBalanceBefore",
	"discountCentsPerUnit",
	"discountedUnitPriceCents",
	"discountTotalCents",
	"distributorCashBalanceAfter",
	"distributorCashBalanceBefore",
	"priceCents",
	"sourceUnitPriceCents",
	"stepDiscountCentsPerUnit",
	"stockValueCents",
	"totalCents",
	"unitPriceCents",
]);

const HIDDEN_DETAIL_KEYS = new Set([
	"phoneNormalized",
	"normalizedPhone",
	"metadata",
]);

const SENSITIVE_KEY_PARTS = ["token", "secret", "password", "hash"];

export function buildOperationDetailPresentation(item: OperationHistoryItem): OperationDetailPresentation {
	const details = isRecord(item.details) ? item.details : {};
	const usedKeys = new Set<string>();
	const sections: OperationDetailSection[] = [];

	pushSection(sections, buildParticipantSection(details, usedKeys));
	pushSection(sections, buildProductSection(item, details, usedKeys));
	pushSection(sections, buildMoneySection(details, usedKeys));
	pushSection(sections, buildBalanceSection(details, usedKeys));
	pushSection(sections, buildCommentSection(details, usedKeys));
	pushSection(sections, buildChangesSection(details, usedKeys));
	pushSection(sections, buildFallbackSection(details, usedKeys));

	const summary: OperationDetailRow[] = [
		{ label: "Статус", value: formatStatus(item.status) },
		{ label: "Роль", value: ROLE_LABELS[item.actor.role] },
		{ label: "Источник", value: getEntityLabel(item.entityType) },
	];

	if (item.amountCents !== undefined) {
		summary.push({ label: "Сумма", value: formatMoney(item.amountCents) });
	}

	return {
		title: getOperationLabel(item.operationType),
		description: `${formatDateTime(item.createdAt)} · ${item.actor.displayName}`,
		summary,
		sections,
	};
}

function buildParticipantSection(details: Record<string, unknown>, usedKeys: Set<string>): OperationDetailSection | null {
	const rows: OperationDetailRow[] = [];

	addStringRow(rows, details, usedKeys, "clientName", "Клиент");
	addStringRow(rows, details, usedKeys, "distributorName", "Распределитель");
	addStringRow(rows, details, usedKeys, "courierDisplayName", "Курьер");
	addStringRow(rows, details, usedKeys, "courierName", "Курьер");
	addStringRow(rows, details, usedKeys, "courierLogin", "Курьер");
	addStringRow(rows, details, usedKeys, "createdByName", "Создал");
	addStringRow(rows, details, usedKeys, "completedByName", "Исполнитель");
	addRoleRow(rows, details, usedKeys, "recipientRole", "Получатель");

	return rows.length ? { title: "Участники", rows } : null;
}

function buildProductSection(
	item: OperationHistoryItem,
	details: Record<string, unknown>,
	usedKeys: Set<string>,
): OperationDetailSection | null {
	const rows: OperationDetailRow[] = [];

	if (Array.isArray(details.items)) {
		usedKeys.add("items");
		details.items.forEach((entry, index) => {
			if (!isRecord(entry)) {
				rows.push({ label: `Строка ${index + 1}`, value: formatValue(entry) });
				return;
			}
			const productName = stringValue(entry.productName) ?? `Строка ${index + 1}`;
			const value = [
				formatQuantity(entry.quantity),
				formatPricePerUnit(entry.unitPriceCents),
				formatMoneyPart("Стоимость", entry.stockValueCents),
			].filter(Boolean).join(" · ");
			rows.push({ label: productName, value: value || "Не указано" });
			addBalancePair(rows, entry, "courierBalanceBefore", "courierBalanceAfter", "Остаток курьера");
			addBalancePair(rows, entry, "distributorBalanceBefore", "distributorBalanceAfter", "Остаток распределителя");
		});
	}

	addStringRow(rows, details, usedKeys, "productName", "Продукция");
	addStringRow(rows, details, usedKeys, "name", "Название");
	addStringRow(rows, details, usedKeys, "rawMaterialTypeName", "Сырье");
	addStringRow(rows, details, usedKeys, "packagingTypeName", "Тара");
	addQuantityRow(rows, details, usedKeys, "quantity", "Количество");
	addQuantityRow(rows, details, usedKeys, "consumedRawMaterialQuantity", "Расход сырья", details.rawMaterialUnit);
	addQuantityRow(rows, details, usedKeys, "consumedPackagingQuantity", "Расход тары", details.packagingUnit);
	addMoneyRow(rows, details, usedKeys, "unitPriceCents", "Цена");
	addMoneyRow(rows, details, usedKeys, "priceCents", "Цена");
	addMoneyRow(rows, details, usedKeys, "baseUnitPriceCents", "Базовая цена");
	addMoneyRow(rows, details, usedKeys, "sourceUnitPriceCents", "Текущая цена");
	addMoneyRow(rows, details, usedKeys, "discountedUnitPriceCents", "Новая цена");
	addMoneyRow(rows, details, usedKeys, "discountCentsPerUnit", "Скидка за единицу");
	addMoneyRow(rows, details, usedKeys, "stepDiscountCentsPerUnit", "Снижение на этом шаге");
	addMoneyRow(rows, details, usedKeys, "discountTotalCents", "Сумма скидки");
	addMoneyRow(rows, details, usedKeys, "stockValueCents", "Стоимость");

	if (!rows.some((row) => row.label === "Количество") && item.quantity !== undefined) {
		rows.push({ label: "Количество", value: `${item.quantity} шт` });
	}

	return rows.length ? { title: "Товар", rows } : null;
}

function buildMoneySection(details: Record<string, unknown>, usedKeys: Set<string>): OperationDetailSection | null {
	const rows: OperationDetailRow[] = [];

	addMoneyRow(rows, details, usedKeys, "totalCents", "Итого");
	addMoneyRow(rows, details, usedKeys, "amountCents", "Сумма");
	addMoneyRow(rows, details, usedKeys, "cashAmountCents", "Наличными");
	addPaymentMethodRow(rows, details, usedKeys);
	addBalancePair(rows, details, "cashBalanceBefore", "cashBalanceAfter", "Наличные");
	addBalancePair(rows, details, "courierCashBalanceBefore", "courierCashBalanceAfter", "Наличные курьера");
	addBalancePair(rows, details, "distributorCashBalanceBefore", "distributorCashBalanceAfter", "Наличные распределителя");

	for (const key of [
		"cashBalanceBefore",
		"cashBalanceAfter",
		"courierCashBalanceBefore",
		"courierCashBalanceAfter",
		"distributorCashBalanceBefore",
		"distributorCashBalanceAfter",
	]) {
		usedKeys.add(key);
	}

	return rows.length ? { title: "Деньги", rows } : null;
}

function buildBalanceSection(details: Record<string, unknown>, usedKeys: Set<string>): OperationDetailSection | null {
	const rows: OperationDetailRow[] = [];
	const pairs = [
		["stockBalanceBefore", "stockBalanceAfter", "Остаток товара"],
		["productBalanceBefore", "productBalanceAfter", "Остаток товара"],
		["sourceQuantityBefore", "sourceQuantityAfter", "Исходная строка"],
		["discountedQuantityBefore", "discountedQuantityAfter", "Дисконтированная строка"],
		["courierStockBalanceBefore", "courierStockBalanceAfter", "Остаток курьера"],
		["courierBalanceBefore", "courierBalanceAfter", "Остаток курьера"],
		["distributorBalanceBefore", "distributorBalanceAfter", "Остаток распределителя"],
		["workshopBalanceBefore", "workshopBalanceAfter", "Остаток цеха"],
	] as const;

	pairs.forEach(([beforeKey, afterKey, label]) => {
		addBalancePair(rows, details, beforeKey, afterKey, label);
		usedKeys.add(beforeKey);
		usedKeys.add(afterKey);
	});

	return rows.length ? { title: "Остатки", rows } : null;
}

function buildCommentSection(details: Record<string, unknown>, usedKeys: Set<string>): OperationDetailSection | null {
	const rows: OperationDetailRow[] = [];

	addStringRow(rows, details, usedKeys, "reason", "Причина");
	addStringRow(rows, details, usedKeys, "comment", "Комментарий");
	addStringRow(rows, details, usedKeys, "message", "Текст задачи");
	addStatusRow(rows, details, usedKeys, "statusBefore", "Статус до");
	addStatusRow(rows, details, usedKeys, "statusAfter", "Статус после");

	return rows.length ? { title: "Комментарий", rows } : null;
}

function buildChangesSection(details: Record<string, unknown>, usedKeys: Set<string>): OperationDetailSection | null {
	const changes = details.changes;

	if (!isRecord(changes)) {
		return null;
	}

	usedKeys.add("changes");
	const rows = collectFallbackRows(changes, "Изменение");

	return rows.length ? { title: "Изменения", rows } : null;
}

function buildFallbackSection(details: Record<string, unknown>, usedKeys: Set<string>): OperationDetailSection | null {
	const visibleDetails = Object.fromEntries(
		Object.entries(details).filter(([key, value]) => !usedKeys.has(key) && !isHiddenDetail(key, value)),
	);
	const rows = collectFallbackRows(visibleDetails, "Деталь");

	return rows.length ? { title: "Детали", rows } : null;
}

function collectFallbackRows(value: unknown, fallbackLabel: string): OperationDetailRow[] {
	if (Array.isArray(value)) {
		return value.flatMap((entry, index) => {
			if (isRecord(entry)) {
				return [{
					label: `${fallbackLabel} ${index + 1}`,
					value: summarizeRecord(entry),
				}];
			}

			if (isDisplayable(entry)) {
				return [{ label: `${fallbackLabel} ${index + 1}`, value: formatValue(entry) }];
			}

			return [];
		});
	}

	if (!isRecord(value)) {
		return isDisplayable(value) ? [{ label: fallbackLabel, value: formatValue(value) }] : [];
	}

	return Object.entries(value).flatMap(([key, entry]) => {
		if (isHiddenDetail(key, entry)) {
			return [];
		}

		if (Array.isArray(entry)) {
			const childRows = collectFallbackRows(entry, getDetailLabel(key));
			return childRows.length ? childRows : [];
		}

		if (isRecord(entry)) {
			const summary = summarizeRecord(entry);
			return summary ? [{ label: getDetailLabel(key), value: summary }] : [];
		}

		if (!isDisplayable(entry)) {
			return [];
		}

		return [{ label: getDetailLabel(key), value: formatValue(entry, key) }];
	});
}

function summarizeRecord(record: Record<string, unknown>): string {
	const name = firstString(record, [
		"productName",
		"clientName",
		"distributorName",
		"courierDisplayName",
		"courierName",
		"courierLogin",
		"rawMaterialTypeName",
		"packagingTypeName",
		"name",
		"login",
		"message",
	]);
	const parts = Object.entries(record)
		.filter(([key, value]) => !isHiddenDetail(key, value))
		.filter(([key]) => key !== "productName" && key !== "clientName" && key !== "distributorName" && key !== "name")
		.map(([key, value]) => `${getDetailLabel(key)}: ${formatValue(value, key)}`);

	return [name, ...parts].filter(Boolean).join(" · ");
}

function addStringRow(
	rows: OperationDetailRow[],
	details: Record<string, unknown>,
	usedKeys: Set<string>,
	key: string,
	label: string,
) {
	usedKeys.add(key);
	const value = details[key];

	if (typeof value === "string" && value.trim().length > 0 && value !== "[redacted]") {
		rows.push({ label, value });
	}
}

function addMoneyRow(
	rows: OperationDetailRow[],
	details: Record<string, unknown>,
	usedKeys: Set<string>,
	key: string,
	label: string,
) {
	usedKeys.add(key);
	const value = details[key];

	if (typeof value === "number" && Number.isFinite(value)) {
		rows.push({ label, value: formatMoney(value) });
	}
}

function addQuantityRow(
	rows: OperationDetailRow[],
	details: Record<string, unknown>,
	usedKeys: Set<string>,
	key: string,
	label: string,
	unitOverride?: unknown,
) {
	usedKeys.add(key);
	const formatted = formatQuantity(details[key], unitOverride ?? details.unit);

	if (formatted) {
		rows.push({ label, value: formatted });
	}
}

function addPaymentMethodRow(rows: OperationDetailRow[], details: Record<string, unknown>, usedKeys: Set<string>) {
	usedKeys.add("paymentMethod");
	const value = details.paymentMethod;

	if (typeof value === "string" && value.length > 0) {
		rows.push({ label: "Оплата", value: formatPaymentMethod(value) });
	}
}

function addRoleRow(
	rows: OperationDetailRow[],
	details: Record<string, unknown>,
	usedKeys: Set<string>,
	key: string,
	label: string,
) {
	usedKeys.add(key);
	const value = details[key];

	if (typeof value === "string" && value in ROLE_LABELS) {
		rows.push({ label, value: ROLE_LABELS[value as keyof typeof ROLE_LABELS] });
	}
}

function addStatusRow(
	rows: OperationDetailRow[],
	details: Record<string, unknown>,
	usedKeys: Set<string>,
	key: string,
	label: string,
) {
	usedKeys.add(key);
	const value = details[key];

	if (typeof value === "string" && value.length > 0) {
		rows.push({ label, value: formatStatus(value) });
	}
}

function addBalancePair(
	rows: OperationDetailRow[],
	details: Record<string, unknown>,
	beforeKey: string,
	afterKey: string,
	label: string,
) {
	const before = details[beforeKey];
	const after = details[afterKey];

	if (isDisplayable(before) && isDisplayable(after)) {
		const money = MONEY_DETAIL_KEYS.has(beforeKey) || MONEY_DETAIL_KEYS.has(afterKey);
		rows.push({
			label,
			value: `${formatValue(before, money ? "amountCents" : beforeKey)} -> ${formatValue(after, money ? "amountCents" : afterKey)}`,
		});
	}
}

function pushSection(sections: OperationDetailSection[], section: OperationDetailSection | null) {
	if (section && section.rows.length > 0) {
		sections.push(section);
	}
}

export function getOperationLabel(operationType: string): string {
	return OPERATION_LABELS[operationType] ?? operationType;
}

export function getEntityLabel(entityType: string): string {
	return ENTITY_LABELS[entityType] ?? entityType;
}

function getDetailLabel(key: string): string {
	return DETAIL_LABELS[key] ?? humanizeKey(key);
}

export function formatMoney(amountCents: number): string {
	const sign = amountCents < 0 ? "-" : "";
	const absolute = Math.abs(amountCents);
	const rubles = Math.floor(absolute / 100);
	const cents = String(absolute % 100).padStart(2, "0");
	return `${sign}${formatInteger(rubles)}.${cents} ₽`;
}

export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
	}).format(new Date(value));
}

function formatInteger(value: number): string {
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatPaymentMethod(value: string): string {
	if (value === "cash") {
		return "Наличные";
	}

	if (value === "cashless") {
		return "Безнал";
	}

	return value;
}

function formatStatus(value: string): string {
	const labels: Record<string, string> = {
		completed: "Выполнена",
		failed: "Ошибка",
		new: "Новая",
		succeeded: "Выполнено",
	};

	return labels[value] ?? value;
}

function formatValue(value: unknown, key?: string): string {
	if (typeof value === "number" && key && MONEY_DETAIL_KEYS.has(key)) {
		return formatMoney(value);
	}

	if (typeof value === "boolean") {
		return value ? "Да" : "Нет";
	}

	if (typeof value === "string") {
		return formatKnownString(value, key);
	}

	if (Array.isArray(value)) {
		const rows = collectFallbackRows(value, "Запись");
		return rows.map((row) => `${row.label}: ${row.value}`).join(" · ");
	}

	if (isRecord(value)) {
		return summarizeRecord(value);
	}

	if (value === null || value === undefined || value === "") {
		return "Не указано";
	}

	return String(value);
}

function formatKnownString(value: string, key?: string): string {
	if (key === "paymentMethod") {
		return formatPaymentMethod(value);
	}

	if (key === "status" || key === "statusBefore" || key === "statusAfter") {
		return formatStatus(value);
	}

	return value;
}

function formatQuantity(value: unknown, unit?: unknown): string | null {
	if (typeof value !== "number" && typeof value !== "string") {
		return null;
	}

	const normalizedUnit = typeof unit === "string" && unit.trim().length > 0 ? unit : "шт";
	return `${value} ${normalizedUnit}`;
}

function formatPricePerUnit(value: unknown): string | null {
	return typeof value === "number" ? `${formatMoney(value)}/шт` : null;
}

function formatMoneyPart(label: string, value: unknown): string | null {
	return typeof value === "number" ? `${label}: ${formatMoney(value)}` : null;
}

function isHiddenDetail(key: string, value: unknown): boolean {
	const normalizedKey = key.toLowerCase();

	return normalizedKey === "id"
		|| normalizedKey.endsWith("id")
		|| HIDDEN_DETAIL_KEYS.has(key)
		|| normalizedKey.includes("normalized")
		|| SENSITIVE_KEY_PARTS.some((part) => normalizedKey.includes(part))
		|| value === "[redacted]";
}

function isDisplayable(value: unknown): boolean {
	return value !== null && value !== undefined && value !== "" && value !== "[redacted]";
}

function stringValue(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = stringValue(record[key]);
		if (value) {
			return value;
		}
	}

	return null;
}

function humanizeKey(key: string): string {
	return key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
