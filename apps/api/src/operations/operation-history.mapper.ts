import { isRole, type OperationHistoryItem, type Role } from "@buhta/shared";
import { redactOperationDetails } from "./operation-history-redaction";

type OperationHistoryRecord = {
	id: string;
	operationId: string;
	action: string;
	entityType: string;
	entityId: string | null;
	details: unknown;
	createdAt: Date;
	operation: {
		type: string;
		status: string;
	};
	actor: {
		id: string;
		username: string | null;
		email: string;
		name: string;
		displayUsername: string | null;
		role: string;
	};
};

const SUMMARY_BY_OPERATION_TYPE: Record<string, string> = {
	"catalog.distributor.archive": "Архивирование распределителя",
	"catalog.distributor.create": "Создание распределителя",
	"catalog.distributor.update": "Обновление распределителя",
	"catalog.packaging_type.archive": "Архивирование тары",
	"catalog.packaging_type.create": "Создание тары",
	"catalog.packaging_type.update": "Обновление тары",
	"catalog.product_template.archive": "Архивирование продукции",
	"catalog.product_template.create": "Создание продукции",
	"catalog.product_template.update": "Обновление продукции",
	"catalog.raw_material_type.archive": "Архивирование сырья",
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
	"distributor.sale.cancel": "Отмена продажи с распределителя",
	"distributor.sale.create": "Продажа с распределителя",
	"foundation.baseline": "Проверочная операция",
	"production.notification.complete": "Выполнение задачи производству",
	"production.notification.create": "Задача производству",
	"production.packaging_intake.create": "Поступление тары",
	"production.product_batch.create": "Выпуск продукции",
	"production.product_transfer.create": "Перемещение на распределитель",
	"production.raw_material_intake.create": "Поступление сырья",
	"user.create": "Создание пользователя",
	"user.identity.update": "Изменение пользователя",
	"user.password.change": "Смена пароля",
	"user.password.reset": "Сброс пароля",
	"user.role.update": "Изменение роли пользователя",
};

const AMOUNT_KEYS = [
	"totalCents",
	"amountCents",
	"cashAmountCents",
	"stockValueCents",
	"discountTotalCents",
];

export function mapOperationHistoryItem(record: OperationHistoryRecord): OperationHistoryItem {
	const redactedDetails = redactOperationDetails(record.details);
	const item: OperationHistoryItem = {
		id: record.id,
		operationId: record.operationId,
		operationType: record.operation.type,
		action: record.action,
		status: record.operation.status,
		entityType: record.entityType,
		entityId: record.entityId,
		createdAt: record.createdAt.toISOString(),
		actor: {
			userId: record.actor.id,
			login: loginForUser(record.actor),
			displayName: displayNameForUser(record.actor),
			role: roleForUser(record.actor.role),
		},
		summary: SUMMARY_BY_OPERATION_TYPE[record.operation.type] ?? record.action,
		details: redactedDetails,
	};
	const amountCents = extractAmountCents(redactedDetails);
	const quantity = extractQuantity(redactedDetails);

	if (amountCents !== undefined) {
		item.amountCents = amountCents;
	}

	if (quantity !== undefined) {
		item.quantity = quantity;
	}

	return item;
}

function loginForUser(user: OperationHistoryRecord["actor"]): string {
	return user.username ?? user.displayUsername ?? user.email;
}

function displayNameForUser(user: OperationHistoryRecord["actor"]): string {
	return user.name || user.displayUsername || user.username || user.email;
}

function roleForUser(value: string): Role {
	return isRole(value) ? value : "courier";
}

function extractAmountCents(details: unknown): number | undefined {
	if (!isRecord(details)) {
		return undefined;
	}

	for (const key of AMOUNT_KEYS) {
		const value = details[key];
		if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
			return value;
		}
	}

	return undefined;
}

function extractQuantity(details: unknown): string | number | undefined {
	if (!isRecord(details)) {
		return undefined;
	}

	const quantity = details.quantity;

	if (typeof quantity === "number" || typeof quantity === "string") {
		return quantity;
	}

	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
