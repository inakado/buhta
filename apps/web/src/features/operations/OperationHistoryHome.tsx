"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Filter, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { OperationHistoryItem, OperationHistoryQuery } from "@buhta/shared";
import { getOperationHistory, getOperationHistoryOptions } from "../../lib/api-client";
import { ROLE_LABELS } from "../../lib/role-labels";

const DEFAULT_LIMIT = 30;
const DEFAULT_RANGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

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
	amountCents: "Сумма",
	availableQuantity: "Доступно",
	baseUnitPriceCents: "Базовая цена",
	cashAmountCents: "Наличными",
	cashBalanceAfter: "Наличные после",
	cashBalanceBefore: "Наличные до",
	clientName: "Клиент",
	comment: "Комментарий",
	discountCentsPerUnit: "Скидка за единицу",
	discountTotalCents: "Сумма скидки",
	distributorName: "Распределитель",
	newRole: "Новая роль",
	oldRole: "Старая роль",
	paymentMethod: "Оплата",
	productName: "Товар",
	quantity: "Количество",
	reason: "Причина",
	sourceQuantityAfter: "Остаток источника после",
	sourceQuantityBefore: "Остаток источника до",
	status: "Статус",
	stockValueCents: "Стоимость остатка",
	totalCents: "Итого",
	unitPriceCents: "Цена",
};

const MONEY_DETAIL_KEYS = new Set([
	"amountCents",
	"baseUnitPriceCents",
	"cashAmountCents",
	"cashBalanceAfter",
	"cashBalanceBefore",
	"discountCentsPerUnit",
	"discountTotalCents",
	"stockValueCents",
	"totalCents",
	"unitPriceCents",
]);

export function OperationHistoryHome() {
	const defaultFilters = useMemo(() => getDefaultFilters(), []);
	const [filters, setFilters] = useState(defaultFilters);
	const [cursor, setCursor] = useState<string | undefined>();
	const [selectedItem, setSelectedItem] = useState<OperationHistoryItem | null>(null);
	const options = useQuery({
		queryKey: ["operations", "history", "options"],
		queryFn: getOperationHistoryOptions,
	});
	const query: OperationHistoryQuery = {
		...filters,
		cursor,
		limit: DEFAULT_LIMIT,
	};
	const history = useQuery({
		queryKey: ["operations", "history", query],
		queryFn: () => getOperationHistory(query),
	});

	function updateFilter(key: keyof typeof filters, value: string) {
		setCursor(undefined);
		setFilters((current) => ({
			...current,
			[key]: value || undefined,
		}));
	}

	function resetFilters() {
		setCursor(undefined);
		setFilters(defaultFilters);
	}

	return (
		<section className="screen-stack operation-history-home">
			<div className="section-heading compact">
				<h2>История</h2>
				{history.isFetching || options.isFetching ? <span>Обновление</span> : null}
			</div>

			<div className="operation-history-filters" aria-label="Фильтры истории">
				<div className="operation-history-filter-title">
					<Filter aria-hidden size={16} />
					<span>Фильтры</span>
				</div>
				<label>
					<span>С</span>
					<input
						type="date"
						value={filters.dateFrom ?? ""}
						onChange={(event) => updateFilter("dateFrom", event.target.value)}
					/>
				</label>
				<label>
					<span>По</span>
					<input
						type="date"
						value={filters.dateTo ?? ""}
						onChange={(event) => updateFilter("dateTo", event.target.value)}
					/>
				</label>
				<label>
					<span>Событие</span>
					<select
						value={filters.operationType ?? ""}
						onChange={(event) => updateFilter("operationType", event.target.value)}
					>
						<option value="">Все</option>
						{options.data?.operationTypes.map((operationType) => (
							<option key={operationType} value={operationType}>
								{getOperationLabel(operationType)}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>Пользователь</span>
					<select
						value={filters.actorUserId ?? ""}
						onChange={(event) => updateFilter("actorUserId", event.target.value)}
					>
						<option value="">Все</option>
						{options.data?.actorUsers.map((actor) => (
							<option key={actor.userId} value={actor.userId}>
								{actor.displayName}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>Роль</span>
					<select
						value={filters.actorRole ?? ""}
						onChange={(event) => updateFilter("actorRole", event.target.value)}
					>
						<option value="">Все</option>
						{options.data?.roles.map((role) => (
							<option key={role} value={role}>
								{ROLE_LABELS[role]}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>Источник</span>
					<select
						value={filters.entityType ?? ""}
						onChange={(event) => updateFilter("entityType", event.target.value)}
					>
						<option value="">Все</option>
						{options.data?.entityTypes.map((entityType) => (
							<option key={entityType} value={entityType}>
								{getEntityLabel(entityType)}
							</option>
						))}
					</select>
				</label>
				<button className="secondary-button compact-button" onClick={resetFilters} type="button">
					<X aria-hidden size={15} />
					Сбросить
				</button>
			</div>

			{history.isError ? <p className="form-error">{history.error.message}</p> : null}
			{options.isError ? <p className="form-error">{options.error.message}</p> : null}
			{history.isLoading ? <p className="muted">Загрузка истории</p> : null}
			{!history.isLoading && !history.isError && (history.data?.items.length ?? 0) === 0 ? (
				<p className="muted">Операций за выбранный период нет.</p>
			) : null}

			<div className="operation-history-list">
				{history.data?.items.map((item) => (
					<OperationHistoryRow
						item={item}
						key={item.id}
						onOpen={() => setSelectedItem(item)}
					/>
				))}
			</div>

			{history.data?.nextCursor ? (
				<button
					className="secondary-button operation-history-more"
					disabled={history.isFetching}
					onClick={() => setCursor(history.data?.nextCursor ?? undefined)}
					type="button"
				>
					Показать еще
				</button>
			) : null}

			<OperationDetailsModal
				item={selectedItem}
				onClose={() => setSelectedItem(null)}
			/>
		</section>
	);
}

function OperationHistoryRow({
	item,
	onOpen,
}: {
	item: OperationHistoryItem;
	onOpen: () => void;
}) {
	const meta = [
		item.actor.displayName,
		ROLE_LABELS[item.actor.role],
		getEntityLabel(item.entityType),
		formatDateTime(item.createdAt),
	].filter(Boolean).join(" · ");

	return (
		<button className="operation-history-row" onClick={onOpen} type="button">
			<div className="operation-history-row-main">
				<strong>{getOperationLabel(item.operationType)}</strong>
				<p>{meta}</p>
			</div>
			<div className="operation-history-row-side">
				{item.amountCents !== undefined ? <strong>{formatMoney(item.amountCents)}</strong> : null}
				{item.quantity !== undefined ? <span>{item.quantity} шт</span> : null}
			</div>
			<ChevronRight aria-hidden size={18} />
		</button>
	);
}

function OperationDetailsModal({
	item,
	onClose,
}: {
	item: OperationHistoryItem | null;
	onClose: () => void;
}) {
	return (
		<Dialog.Root open={Boolean(item)} onOpenChange={(open) => {
			if (!open) {
				onClose();
			}
		}}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-history-dialog-overlay" />
				<Dialog.Content className="operation-history-dialog">
					{item ? (
						<>
							<div className="operation-history-dialog-heading">
								<div>
									<Dialog.Title>{getOperationLabel(item.operationType)}</Dialog.Title>
									<Dialog.Description>
										{formatDateTime(item.createdAt)} · {item.actor.displayName}
									</Dialog.Description>
								</div>
								<Dialog.Close className="icon-button" aria-label="Закрыть">
									<X aria-hidden size={18} />
								</Dialog.Close>
							</div>
							<div className="operation-history-detail-summary">
								<DetailSummary label="Статус" value={item.status} />
								<DetailSummary label="Роль" value={ROLE_LABELS[item.actor.role]} />
								<DetailSummary label="Источник" value={getEntityLabel(item.entityType)} />
								{item.amountCents !== undefined ? (
									<DetailSummary label="Сумма" value={formatMoney(item.amountCents)} />
								) : null}
							</div>
							<div className="operation-history-details">
								{renderDetails(item.details)}
							</div>
						</>
					) : null}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function DetailSummary({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function renderDetails(value: unknown): ReactNode {
	if (Array.isArray(value)) {
		return value.length ? (
			<div className="operation-history-detail-list">
				{value.map((item, index) => (
					<div key={index} className="operation-history-detail-nested">
						{renderDetails(item)}
					</div>
				))}
			</div>
		) : <p className="muted">Нет деталей.</p>;
	}

	if (isRecord(value)) {
		const entries = Object.entries(value);
		return entries.length ? (
			<div className="operation-history-detail-list">
				{entries.map(([key, nestedValue]) => (
					<div className="operation-history-detail-row" key={key}>
						<span>{getDetailLabel(key)}</span>
						<div>{renderDetailValue(key, nestedValue)}</div>
					</div>
				))}
			</div>
		) : <p className="muted">Нет деталей.</p>;
	}

	return <p className="muted">{formatValue(value)}</p>;
}

function renderDetailValue(key: string, value: unknown): ReactNode {
	if (isRecord(value) || Array.isArray(value)) {
		return <div className="operation-history-detail-nested">{renderDetails(value)}</div>;
	}

	return <strong>{formatValue(value, key)}</strong>;
}

function formatValue(value: unknown, key?: string): string {
	if (typeof value === "number" && key && MONEY_DETAIL_KEYS.has(key)) {
		return formatMoney(value);
	}
	if (typeof value === "boolean") {
		return value ? "Да" : "Нет";
	}
	if (value === null || value === undefined || value === "") {
		return "Не указано";
	}

	return String(value);
}

function getDefaultFilters(): OperationHistoryQuery {
	const dateTo = new Date();
	const dateFrom = new Date(dateTo.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

	return {
		dateFrom: toDateInputValue(dateFrom),
		dateTo: toDateInputValue(dateTo),
	};
}

function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getOperationLabel(operationType: string): string {
	return OPERATION_LABELS[operationType] ?? operationType;
}

function getEntityLabel(entityType: string): string {
	return ENTITY_LABELS[entityType] ?? entityType;
}

function getDetailLabel(key: string): string {
	return DETAIL_LABELS[key] ?? key;
}

function formatMoney(amountCents: number): string {
	return `${(amountCents / 100).toFixed(2)} ₽`;
}

function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
	}).format(new Date(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
