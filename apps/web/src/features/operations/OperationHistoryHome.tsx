"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronRight, Filter, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isRole, type OperationHistoryItem, type OperationHistoryQuery } from "@buhta/shared";
import { getOperationHistory, getOperationHistoryOptions } from "../../lib/api-client";
import { ROLE_LABELS } from "../../lib/role-labels";
import {
	buildOperationDetailPresentation,
	formatDateTime,
	formatMoney,
	getEntityLabel,
	getOperationLabel,
} from "./operation-detail-presenter";

const DEFAULT_LIMIT = 30;
const DEFAULT_RANGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const FILTER_STORAGE_KEY = "buhta.operationHistory.filters";

export function OperationHistoryHome() {
	const defaultFilters = useMemo(() => getDefaultFilters(), []);
	const [filters, setFilters] = useState(defaultFilters);
	const [filtersHydrated, setFiltersHydrated] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<OperationHistoryItem | null>(null);
	const activeFilterCount = getAdvancedFilterCount(filters);
	const options = useQuery({
		queryKey: ["operations", "history", "options"],
		queryFn: getOperationHistoryOptions,
	});
	const history = useInfiniteQuery({
		queryKey: ["operations", "history", filters],
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam }) => getOperationHistory({
			...filters,
			cursor: typeof pageParam === "string" ? pageParam : undefined,
			limit: DEFAULT_LIMIT,
		}),
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
	const historyItems = history.data?.pages.flatMap((page) => page.items) ?? [];

	useEffect(() => {
		const storedFilters = readStoredFilters(defaultFilters);
		if (storedFilters) {
			setFilters(storedFilters);
		}
		setFiltersHydrated(true);
	}, [defaultFilters]);

	useEffect(() => {
		if (filtersHydrated) {
			window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
		}
	}, [filters, filtersHydrated]);

	function updateFilter(key: keyof typeof filters, value: string) {
		setFilters((current) => ({
			...current,
			[key]: value || undefined,
		}));
	}

	function resetFilters() {
		setFilters(defaultFilters);
		setFiltersOpen(false);
	}

	return (
		<section className="screen-stack operation-history-home">
			<div className="operation-history-topbar">
				<div className="section-heading compact">
					<h2>История</h2>
					{history.isFetching || options.isFetching ? <span>Обновление</span> : null}
				</div>

				<div className="operation-history-filter-summary" aria-label="Период истории">
					<div>
						<span>Период</span>
						<strong>{formatDateRange(filters)}</strong>
					</div>
					<button
						aria-controls="operation-history-filters-dialog"
						aria-expanded={filtersOpen}
						className={filtersOpen
							? "secondary-button compact-button operation-history-filter-toggle active"
							: "secondary-button compact-button operation-history-filter-toggle"}
						onClick={() => setFiltersOpen(true)}
						type="button"
					>
						<Filter aria-hidden size={15} />
						Фильтры
						{activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
					</button>
				</div>
			</div>

			<OperationFiltersDialog
				activeFilterCount={activeFilterCount}
				filters={filters}
				onClose={() => setFiltersOpen(false)}
				onReset={resetFilters}
				onUpdate={updateFilter}
				open={filtersOpen}
				options={options.data}
			/>

			<div className="operation-history-body">
				{history.isError ? <p className="form-error">{history.error.message}</p> : null}
				{options.isError ? <p className="form-error">{options.error.message}</p> : null}
				{history.isPending ? <p className="muted">Загрузка истории</p> : null}
				{!history.isPending && !history.isError && historyItems.length === 0 ? (
					<p className="muted">Операций за выбранный период нет.</p>
				) : null}

				<div className="operation-history-list">
					{historyItems.map((item) => (
						<OperationHistoryRow
							item={item}
							key={item.id}
							onOpen={() => setSelectedItem(item)}
						/>
					))}
				</div>

				{history.hasNextPage ? (
					<button
						className="secondary-button operation-history-more"
						disabled={history.isFetchingNextPage}
						onClick={() => void history.fetchNextPage()}
						type="button"
					>
						{history.isFetchingNextPage ? "Загрузка" : "Показать еще"}
					</button>
				) : null}
			</div>

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
	const hasMetrics = item.amountCents !== undefined || item.quantity !== undefined;
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
			{hasMetrics ? (
				<div className="operation-history-row-side">
					{item.amountCents !== undefined ? <strong>{formatMoney(item.amountCents)}</strong> : null}
					{item.quantity !== undefined ? <span>{item.quantity} шт</span> : null}
				</div>
			) : null}
			<ChevronRight aria-hidden size={18} />
		</button>
	);
}

function OperationFiltersDialog({
	activeFilterCount,
	filters,
	onClose,
	onReset,
	onUpdate,
	open,
	options,
}: {
	activeFilterCount: number;
	filters: OperationHistoryQuery;
	onClose: () => void;
	onReset: () => void;
	onUpdate: (key: keyof OperationHistoryQuery, value: string) => void;
	open: boolean;
	options: Awaited<ReturnType<typeof getOperationHistoryOptions>> | undefined;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={(nextOpen) => {
			if (!nextOpen) {
				onClose();
			}
		}}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content className="operation-dialog operation-history-filter-dialog" id="operation-history-filters-dialog">
					<div className="operation-dialog-heading">
						<div>
							<Dialog.Title>Фильтры</Dialog.Title>
							<Dialog.Description>
								{activeFilterCount > 0 ? `${activeFilterCount} активных` : "Период и параметры истории"}
							</Dialog.Description>
						</div>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					<div className="operation-history-filters" aria-label="Фильтры истории">
						<label>
							<span>С</span>
							<input
								onChange={(event) => onUpdate("dateFrom", event.target.value)}
								type="date"
								value={filters.dateFrom ?? ""}
							/>
						</label>
						<label>
							<span>По</span>
							<input
								onChange={(event) => onUpdate("dateTo", event.target.value)}
								type="date"
								value={filters.dateTo ?? ""}
							/>
						</label>
						<label>
							<span>Событие</span>
							<select
								onChange={(event) => onUpdate("operationType", event.target.value)}
								value={filters.operationType ?? ""}
							>
								<option value="">Все</option>
								{options?.operationTypes.map((operationType) => (
									<option key={operationType} value={operationType}>
										{getOperationLabel(operationType)}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Пользователь</span>
							<select
								onChange={(event) => onUpdate("actorUserId", event.target.value)}
								value={filters.actorUserId ?? ""}
							>
								<option value="">Все</option>
								{options?.actorUsers.map((actor) => (
									<option key={actor.userId} value={actor.userId}>
										{actor.displayName}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Роль</span>
							<select
								onChange={(event) => onUpdate("actorRole", event.target.value)}
								value={filters.actorRole ?? ""}
							>
								<option value="">Все</option>
								{options?.roles.map((role) => (
									<option key={role} value={role}>
										{ROLE_LABELS[role]}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Источник</span>
							<select
								onChange={(event) => onUpdate("entityType", event.target.value)}
								value={filters.entityType ?? ""}
							>
								<option value="">Все</option>
								{options?.entityTypes.map((entityType) => (
									<option key={entityType} value={entityType}>
										{getEntityLabel(entityType)}
									</option>
								))}
							</select>
						</label>
					</div>
					<div className="form-actions">
						<button className="secondary-button" onClick={onReset} type="button">
							Сбросить
						</button>
						<Dialog.Close className="primary-button" type="button">
							Готово
						</Dialog.Close>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function OperationDetailsModal({
	item,
	onClose,
}: {
	item: OperationHistoryItem | null;
	onClose: () => void;
}) {
	const presentation = item ? buildOperationDetailPresentation(item) : null;

	return (
		<Dialog.Root open={Boolean(item)} onOpenChange={(open) => {
			if (!open) {
				onClose();
			}
		}}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content className="operation-dialog operation-history-dialog">
					{presentation ? (
						<>
							<div className="operation-dialog-heading">
								<div>
									<Dialog.Title>{presentation.title}</Dialog.Title>
									<Dialog.Description>
										{presentation.description}
									</Dialog.Description>
								</div>
								<Dialog.Close className="icon-button" aria-label="Закрыть">
									<X aria-hidden size={18} />
								</Dialog.Close>
							</div>
							<div className="operation-history-detail-summary">
								{presentation.summary.map((row) => (
									<DetailSummary key={row.label} label={row.label} value={row.value} />
								))}
							</div>
							<div className="operation-history-details">
								{presentation.sections.length ? presentation.sections.map((section) => (
									<section className="operation-history-detail-section" key={section.title}>
										<h3>{section.title}</h3>
										<div className="operation-history-detail-list">
											{section.rows.map((row) => (
												<div className="operation-history-detail-row" key={`${section.title}-${row.label}-${row.value}`}>
													<span>{row.label}</span>
													<div>
														<strong>{row.value}</strong>
													</div>
												</div>
											))}
										</div>
									</section>
								)) : <p className="muted">Нет деталей.</p>}
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

function getDefaultFilters(): OperationHistoryQuery {
	const dateTo = new Date();
	const dateFrom = new Date(dateTo.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

	return {
		dateFrom: toDateInputValue(dateFrom),
		dateTo: toDateInputValue(dateTo),
	};
}

function readStoredFilters(defaultFilters: OperationHistoryQuery): OperationHistoryQuery | null {
	if (typeof window === "undefined") {
		return null;
	}

	const rawValue = window.localStorage.getItem(FILTER_STORAGE_KEY);
	if (!rawValue) {
		return null;
	}

	try {
		const parsed = JSON.parse(rawValue) as Partial<Record<keyof OperationHistoryQuery, unknown>>;
		return {
			...defaultFilters,
			actorRole: typeof parsed.actorRole === "string" && isRole(parsed.actorRole) ? parsed.actorRole : undefined,
			actorUserId: typeof parsed.actorUserId === "string" ? parsed.actorUserId : undefined,
			dateFrom: typeof parsed.dateFrom === "string" ? parsed.dateFrom : defaultFilters.dateFrom,
			dateTo: typeof parsed.dateTo === "string" ? parsed.dateTo : defaultFilters.dateTo,
			entityType: typeof parsed.entityType === "string" ? parsed.entityType : undefined,
			operationType: typeof parsed.operationType === "string" ? parsed.operationType : undefined,
		};
	} catch {
		return null;
	}
}

function getAdvancedFilterCount(filters: OperationHistoryQuery): number {
	const keys: Array<keyof OperationHistoryQuery> = ["operationType", "actorUserId", "actorRole", "entityType"];

	return keys.filter((key) => Boolean(filters[key])).length;
}

function formatDateRange(filters: OperationHistoryQuery): string {
	const from = filters.dateFrom ? formatDateInputLabel(filters.dateFrom) : null;
	const to = filters.dateTo ? formatDateInputLabel(filters.dateTo) : null;

	if (from && to) {
		return `${from}-${to}`;
	}

	return from ?? to ?? "Все даты";
}

function formatDateInputLabel(value: string): string {
	const [, month, day] = value.split("-");

	if (!month || !day) {
		return value;
	}

	return `${day}.${month}`;
}

function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
