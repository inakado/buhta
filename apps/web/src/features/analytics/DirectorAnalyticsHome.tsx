"use client";

import { useQuery } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { AlertTriangle, Banknote, CalendarDays, ChevronDown, Clock3, Factory, NotebookPen, RefreshCw, Vault, WalletCards } from "lucide-react";
import dynamic from "next/dynamic";
import { useId, useMemo, useReducer, useState, type ReactNode } from "react";
import {
	type DirectAccountingEntry,
	type DirectAccountingDetailPeriod,
	type DirectorAnalyticsPeriodPreset,
	type DirectorAnalyticsProductOutputRow,
	type DirectorAnalyticsRawMaterialRow,
	type DirectorAnalyticsRevenueByDayPoint,
	type DirectorAnalyticsResponse,
} from "@buhta/shared";
import { getDirectAccountingStatistics, getDirectorAnalytics, listDirectAccountingEntries } from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { DateRangePickerPanel } from "../../ui/DateRangePickerPanel";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { formatProductQuantityLabel } from "../operations/product-quantity-input";

const DirectAccountingMoneyChart = dynamic(() => import("./DirectAccountingMoneyChart"), { ssr: false });

const PERIOD_OPTIONS: Array<{ value: DirectorAnalyticsPeriodPreset; label: string }> = [
	{ value: "today", label: "Сегодня" },
	{ value: "7d", label: "7 дней" },
	{ value: "30d", label: "30 дней" },
	{ value: "90d", label: "90 дней" },
];
const ANALYTICS_MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_QUANTITY_FORMATTER = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 3,
});
const ANALYTICS_PERIOD_RANGE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "short",
	timeZone: "Asia/Vladivostok",
});
const ANALYTICS_BUSINESS_DATE_INPUT_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	day: "2-digit",
	month: "2-digit",
	timeZone: "Asia/Vladivostok",
	year: "numeric",
});
const ANALYTICS_CHART_THOUSANDS_FORMATTER = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 1,
});
const ANALYTICS_CHART_INTEGER_FORMATTER = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 0,
});
const ANALYTICS_CHART_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "short",
	timeZone: "Asia/Vladivostok",
});
const DIRECT_ACCOUNTING_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	timeZone: "UTC",
});
const EMPTY_DIRECT_ACCOUNTING_ENTRIES: DirectAccountingEntry[] = [];

const VIEW_OPTIONS = [
	{ value: "overview", label: "Обзор", icon: Clock3 },
	{ value: "money", label: "Деньги", icon: WalletCards },
	{ value: "production", label: "Производство", icon: Factory },
] as const;

const DIRECT_ACCOUNTING_PERIOD_OPTIONS: Array<{ value: DirectAccountingDetailPeriod; label: string }> = [
	{ value: "day", label: "Сегодня" },
	{ value: "week", label: "7 дней" },
	{ value: "month", label: "30 дней" },
];

type StandardAnalyticsViewMode = typeof VIEW_OPTIONS[number]["value"];
type AnalyticsViewMode = StandardAnalyticsViewMode | "directAccounting";

type DirectAccountingPeriodSelection =
	| { mode: "preset"; period: DirectAccountingDetailPeriod }
	| { mode: "custom"; dateFrom: string; dateTo: string };

export type DirectorPeriodSelection =
	| {
		mode: "preset";
		periodPreset: DirectorAnalyticsPeriodPreset;
	}
	| {
		mode: "custom";
		dateFrom: string;
		dateTo: string;
	};

type RawMaterialSummaryRow = {
	rawMaterialTypeId: string;
	rawMaterialName: string;
	unit: string;
	intakeQuantity: number;
	consumedQuantity: number;
	balanceQuantity: number;
};

type RevenueChartPoint = {
	date: string;
	value: number;
	x: number;
	y: number;
};

type RevenueChartGeometry = {
	areaPath: string;
	gridLines: Array<{ label: string; y: number }>;
	lastPoint: RevenueChartPoint | null;
	linePath: string;
	plot: {
		left: number;
		right: number;
	};
	points: RevenueChartPoint[];
};

type DirectorAnalyticsState = {
	periodSelection: DirectorPeriodSelection;
	periodPickerOpen: boolean;
	customDateFrom: string;
	customDateTo: string;
	customPeriodError: string | null;
	viewMode: AnalyticsViewMode;
};

type DirectorAnalyticsAction =
	| { type: "selectPreset"; periodPreset: DirectorAnalyticsPeriodPreset }
	| { type: "setPeriodPickerOpen"; open: boolean }
	| { type: "openPeriodPicker"; dateFrom: string; dateTo: string }
	| { type: "setCustomRange"; dateFrom: string; dateTo: string }
	| { type: "setCustomPeriodError"; error: string | null }
	| { type: "applyCustomPeriod" }
	| { type: "setViewMode"; viewMode: AnalyticsViewMode };

type DirectAccountingChartPoint = {
	date: string;
	label: string;
	revenueCents: number;
	expensesCents: number;
	transfersCents: number;
};

const INITIAL_DIRECTOR_ANALYTICS_STATE: DirectorAnalyticsState = {
	periodSelection: {
		mode: "preset",
		periodPreset: "30d",
	},
	periodPickerOpen: false,
	customDateFrom: "",
	customDateTo: "",
	customPeriodError: null,
	viewMode: "production",
};

function directorAnalyticsReducer(
	state: DirectorAnalyticsState,
	action: DirectorAnalyticsAction,
): DirectorAnalyticsState {
	switch (action.type) {
		case "selectPreset":
			return {
				...state,
				periodSelection: { mode: "preset", periodPreset: action.periodPreset },
				customPeriodError: null,
				periodPickerOpen: false,
			};
		case "setPeriodPickerOpen":
			return { ...state, periodPickerOpen: action.open };
		case "openPeriodPicker":
			return {
				...state,
				periodPickerOpen: true,
				customDateFrom: action.dateFrom,
				customDateTo: action.dateTo,
				customPeriodError: null,
			};
		case "setCustomRange":
			return {
				...state,
				customDateFrom: action.dateFrom,
				customDateTo: action.dateTo,
				customPeriodError: null,
			};
		case "setCustomPeriodError":
			return { ...state, customPeriodError: action.error };
		case "applyCustomPeriod":
			return {
				...state,
				periodSelection: {
					mode: "custom",
					dateFrom: state.customDateFrom,
					dateTo: state.customDateTo,
				},
				customPeriodError: null,
				periodPickerOpen: false,
			};
		case "setViewMode":
			return { ...state, viewMode: action.viewMode };
	}
}

export function DirectorAnalyticsHome({
	initialPeriodSelection = INITIAL_DIRECTOR_ANALYTICS_STATE.periodSelection,
	initialViewMode = "production",
	onOpenDirectAccounting,
	onPeriodSelectionChange,
	title = "Аналитика",
}: {
	initialPeriodSelection?: DirectorPeriodSelection;
	initialViewMode?: AnalyticsViewMode;
	onOpenDirectAccounting?: () => void;
	onPeriodSelectionChange?: (selection: DirectorPeriodSelection) => void;
	title?: string;
} = {}) {
	const [state, dispatch] = useReducer(directorAnalyticsReducer, {
		...INITIAL_DIRECTOR_ANALYTICS_STATE,
		periodSelection: initialPeriodSelection,
		viewMode: initialViewMode,
	});
	const { customDateFrom, customDateTo, customPeriodError, periodPickerOpen, periodSelection, viewMode } = state;
	const analyticsQuery = useMemo(() => {
		if (periodSelection.mode === "custom") {
			return {
				dateFrom: periodSelection.dateFrom,
				dateTo: periodSelection.dateTo,
			};
		}

		return { periodPreset: periodSelection.periodPreset };
	}, [periodSelection]);
	const {
		data: analytics,
		isError: analyticsError,
		isFetching: analyticsFetching,
		isLoading: analyticsLoading,
		refetch: refetchAnalytics,
	} = useQuery({
		queryKey: ["analytics", "director", analyticsQuery],
		queryFn: () => getDirectorAnalytics(analyticsQuery),
	});

	function selectPresetPeriod(periodPreset: DirectorAnalyticsPeriodPreset) {
		dispatch({ type: "selectPreset", periodPreset });
		onPeriodSelectionChange?.({ mode: "preset", periodPreset });
	}

	function setPeriodPickerOpenState(open: boolean) {
		if (open && analytics) {
			dispatch({
				type: "openPeriodPicker",
				dateFrom: formatBusinessDateInputValue(analytics.filters.dateFrom),
				dateTo: formatBusinessDateInputValue(
					new Date(new Date(analytics.filters.dateTo).getTime() - 1).toISOString(),
				),
			});
			return;
		}
		dispatch({ type: "setPeriodPickerOpen", open });
	}

	function applyCustomPeriod() {
		const validationError = validateCustomPeriod(customDateFrom, customDateTo);
		if (validationError) {
			dispatch({ type: "setCustomPeriodError", error: validationError });
			return;
		}

		dispatch({ type: "applyCustomPeriod" });
		onPeriodSelectionChange?.({
			mode: "custom",
			dateFrom: customDateFrom,
			dateTo: customDateTo,
		});
	}

	return (
		<section className="screen-stack director-home director-dashboard">
			<div className="director-dashboard-topbar">
				<div className="director-dashboard-header">
					<div className="director-dashboard-title">
						<h1>{title}</h1>
						<button
							aria-label={viewMode === "directAccounting" ? "Вернуться к основной аналитике" : "Открыть статистику прямого учета"}
							aria-pressed={viewMode === "directAccounting"}
							className={viewMode === "directAccounting" ? "director-dashboard-direct-toggle active" : "director-dashboard-direct-toggle"}
							onClick={() => dispatch({
								type: "setViewMode",
								viewMode: viewMode === "directAccounting" ? "production" : "directAccounting",
							})}
							type="button"
						>
							<NotebookPen aria-hidden size={18} />
							<span className="director-dashboard-direct-toggle-label">Прямой учет</span>
						</button>
					</div>
					{analytics && viewMode !== "directAccounting" ? (
						<Popover.Root open={periodPickerOpen} onOpenChange={setPeriodPickerOpenState}>
							<Popover.Trigger asChild>
								<button
									aria-controls="director-dashboard-period-picker"
									aria-expanded={periodPickerOpen}
									className="director-dashboard-date"
									type="button"
								>
									<CalendarDays aria-hidden size={18} />
									<span>{formatPeriodRange(analytics.filters.dateFrom, analytics.filters.dateTo)}</span>
									<ChevronDown aria-hidden size={16} />
								</button>
							</Popover.Trigger>
							<Popover.Content
								align="end"
								aria-label="Выбор периода аналитики"
								className="director-dashboard-period-picker"
								collisionPadding={12}
								id="director-dashboard-period-picker"
								sideOffset={8}
							>
								<DateRangePickerPanel
									ariaLabel="Календарь периода аналитики"
									dateFrom={customDateFrom}
									dateTo={customDateTo}
									error={customPeriodError}
									maxDays={ANALYTICS_MAX_RANGE_DAYS}
									onChange={({ dateFrom, dateTo }) => dispatch({
										type: "setCustomRange",
										dateFrom,
										dateTo,
									})}
								/>
								<div className="director-dashboard-period-actions">
									<Popover.Close asChild>
										<button type="button">
											Отмена
										</button>
									</Popover.Close>
									<button type="button" onClick={applyCustomPeriod}>
										Применить
									</button>
								</div>
							</Popover.Content>
						</Popover.Root>
					) : null}
					{analyticsFetching && viewMode !== "directAccounting" ? (
						<span className="director-dashboard-sync" aria-label="Обновление">
							<RefreshCw aria-hidden size={16} />
						</span>
					) : null}
				</div>

				{viewMode !== "directAccounting" ? (
					<div className="director-dashboard-desktop-toolbar">
						<AccountingModeSwitch
							directAccounting={false}
							onChange={(directAccounting) => dispatch({
								type: "setViewMode",
								viewMode: directAccounting ? "directAccounting" : "production",
							})}
						/>
						<SegmentedControl
							ariaLabel="Период аналитики"
							className="director-dashboard-period-control"
							items={PERIOD_OPTIONS}
							onChange={selectPresetPeriod}
							role="group"
							value={periodSelection.mode === "preset" ? periodSelection.periodPreset : null}
						/>
					</div>
				) : null}
			</div>

			<div className="director-dashboard-body">
				{analyticsError ? (
					<div className="director-dashboard-message error">
						<AlertTriangle aria-hidden size={18} />
						<span>Не удалось загрузить аналитику.</span>
						<button type="button" onClick={() => void refetchAnalytics()}>
							Повторить
						</button>
					</div>
				) : null}

				{analytics ? (
					<DirectorAnalyticsView
						data={analytics}
						onOpenDirectAccounting={onOpenDirectAccounting}
						onViewModeChange={(nextViewMode) => dispatch({ type: "setViewMode", viewMode: nextViewMode })}
						viewMode={viewMode}
					/>
				) : null}
				{analyticsLoading ? <AnalyticsSkeleton /> : null}
			</div>
		</section>
	);
}

function DirectorAnalyticsView({
	data,
	onOpenDirectAccounting,
	onViewModeChange,
	viewMode,
}: {
	data: DirectorAnalyticsResponse;
	onOpenDirectAccounting: (() => void) | undefined;
	onViewModeChange: (value: AnalyticsViewMode) => void;
	viewMode: AnalyticsViewMode;
}) {
	const rawMaterialRows = useMemo(
		() => buildRawMaterialSummaryRows(data.production),
		[data.production],
	);
	if (viewMode === "directAccounting") {
		return (
			<section className="direct-accounting-standalone" aria-label="Статистика прямого учета">
				<DirectAccountingAnalytics
					onOpenAllOperations={onOpenDirectAccounting}
					onReturnToMain={() => onViewModeChange("production")}
				/>
			</section>
		);
	}

	return (
		<>
			<MoneySummary data={data} />
			<ProductionFlowStrip data={data} />
			<AnalyticsTabbedPanel
				data={data}
				onViewModeChange={onViewModeChange}
				rawMaterialRows={rawMaterialRows}
				viewMode={viewMode}
			/>
		</>
	);
}

function AnalyticsTabbedPanel({
	data,
	onViewModeChange,
	rawMaterialRows,
	viewMode,
}: {
	data: DirectorAnalyticsResponse;
	onViewModeChange: (value: StandardAnalyticsViewMode) => void;
	rawMaterialRows: RawMaterialSummaryRow[];
	viewMode: StandardAnalyticsViewMode;
}) {
	return (
		<>
			<section className="director-dashboard-tabbed-panel">
				<SegmentedControl
					ariaLabel="Раздел аналитики"
					className="director-dashboard-tabs"
					items={VIEW_OPTIONS}
					onChange={onViewModeChange}
					value={viewMode}
				/>
				{viewMode === "money" ? <MoneyAnalytics data={data} /> : null}
				{viewMode === "overview" ? <OverviewAnalytics data={data} /> : null}
				{viewMode === "production" ? <RawMaterialSummary rows={rawMaterialRows} /> : null}
			</section>
			{viewMode === "production" ? (
				<section className="director-dashboard-table-card">
					<ProductList rows={data.production.productReleased} />
				</section>
			) : null}
		</>
	);
}

function DirectAccountingAnalytics({
	onOpenAllOperations,
	onReturnToMain,
}: {
	onOpenAllOperations: (() => void) | undefined;
	onReturnToMain: () => void;
}) {
	const today = formatBusinessDateInputValue(new Date().toISOString());
	const [selection, setSelection] = useState<DirectAccountingPeriodSelection>({ mode: "preset", period: "month" });
	const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
	const [customDateFrom, setCustomDateFrom] = useState(today);
	const [customDateTo, setCustomDateTo] = useState(today);
	const [customPeriodError, setCustomPeriodError] = useState<string | null>(null);
	const statisticsQueryInput = selection.mode === "custom"
		? { dateFrom: selection.dateFrom, dateTo: selection.dateTo }
		: { anchorDate: today, detailPeriod: selection.period };
	const {
		data,
		error: statisticsError,
		isLoading: statisticsLoading,
		refetch: refetchStatistics,
	} = useQuery({
		queryKey: ["direct-accounting", "statistics", statisticsQueryInput],
		queryFn: () => getDirectAccountingStatistics(statisticsQueryInput),
		placeholderData: (previousData) => previousData,
	});
	const entriesRange = data
		? { dateFrom: data.filters.dateFrom, dateTo: data.filters.dateTo }
		: null;
	const { data: entriesData } = useQuery({
		queryKey: ["direct-accounting", "analytics-entries", entriesRange],
		queryFn: () => listDirectAccountingEntries(entriesRange!),
		enabled: Boolean(entriesRange),
		placeholderData: (previousData) => previousData,
	});
	const entries = Array.isArray(entriesData?.entries) ? entriesData.entries : EMPTY_DIRECT_ACCOUNTING_ENTRIES;
	const chartData = useMemo(
		() => data ? buildDirectAccountingChartData(entries, data.filters.dateFrom, data.filters.dateTo) : [],
		[data, entries],
	);

	function selectPresetPeriod(period: DirectAccountingDetailPeriod) {
		setSelection({ mode: "preset", period });
		setPeriodPickerOpen(false);
		setCustomPeriodError(null);
	}

	function changePeriodPickerOpen(open: boolean) {
		if (open) {
			setCustomDateFrom(data?.filters.dateFrom ?? today);
			setCustomDateTo(data?.filters.dateTo ?? today);
			setCustomPeriodError(null);
		}
		setPeriodPickerOpen(open);
	}

	function applyDirectAccountingRange() {
		const effectiveDateTo = customDateTo || customDateFrom;
		const validationError = validateCustomPeriod(customDateFrom, effectiveDateTo)
			?? (effectiveDateTo > today ? "Будущую дату выбрать нельзя." : null);
		if (validationError) {
			setCustomPeriodError(validationError);
			return;
		}
		setSelection({ mode: "custom", dateFrom: customDateFrom, dateTo: effectiveDateTo });
		setCustomDateTo(effectiveDateTo);
		setCustomPeriodError(null);
		setPeriodPickerOpen(false);
	}

	return (
		<div className="direct-accounting-analytics">
			<div className="direct-accounting-desktop-toolbar">
				<AccountingModeSwitch directAccounting onChange={(directAccounting) => {
					if (!directAccounting) onReturnToMain();
				}} />
				<div className="direct-accounting-analytics-controls">
					<SegmentedControl
					ariaLabel="Период прямого учета"
					className="direct-accounting-period-control"
					items={DIRECT_ACCOUNTING_PERIOD_OPTIONS}
					onChange={selectPresetPeriod}
					role="group"
					value={selection.mode === "preset" ? selection.period : null}
				/>
					<Popover.Root open={periodPickerOpen} onOpenChange={changePeriodPickerOpen}>
					<Popover.Trigger asChild>
						<button
							aria-controls="direct-accounting-period-picker"
							aria-expanded={periodPickerOpen}
							className={selection.mode === "custom" ? "direct-accounting-range-button active" : "direct-accounting-range-button"}
							type="button"
						>
							<CalendarDays aria-hidden size={17} />
							<span>{data ? formatDirectAccountingRange(data.filters.dateFrom, data.filters.dateTo) : "Выбрать даты"}</span>
							<ChevronDown aria-hidden size={15} />
						</button>
					</Popover.Trigger>
					<Popover.Portal>
					<Popover.Content
						align="end"
						aria-label="Выбор периода прямого учета"
						className="director-dashboard-period-picker direct-accounting-period-picker"
						collisionPadding={12}
						id="direct-accounting-period-picker"
						sideOffset={8}
					>
						<p className="direct-accounting-period-hint">Выберите один день или диапазон</p>
						<DateRangePickerPanel
							ariaLabel="Календарь прямого учета"
							dateFrom={customDateFrom}
							dateTo={customDateTo}
							error={customPeriodError}
							maxDate={today}
							maxDays={ANALYTICS_MAX_RANGE_DAYS}
							onChange={({ dateFrom, dateTo }) => {
								setCustomDateFrom(dateFrom);
								setCustomDateTo(dateTo);
								setCustomPeriodError(null);
							}}
						/>
						<div className="director-dashboard-period-actions">
							<Popover.Close asChild>
								<button type="button">Отмена</button>
							</Popover.Close>
							<button type="button" onClick={applyDirectAccountingRange}>Показать</button>
						</div>
					</Popover.Content>
					</Popover.Portal>
					</Popover.Root>
				</div>
			</div>

			{statisticsLoading ? <AnalyticsSkeleton /> : null}
			{statisticsError ? (
				<div className="director-dashboard-message error">
					<AlertTriangle aria-hidden size={18} />
					<span>Не удалось загрузить прямой учет.</span>
					<button onClick={() => void refetchStatistics()} type="button">Повторить</button>
				</div>
			) : null}

			{data ? (
				<>
					<section className="direct-accounting-summary" aria-label="Итоги выбранного периода">
						<div className={data.selection.balanceQuantityKg < 0 ? "negative" : ""}>
							<span>Остаток товара</span>
							<strong>{formatQuantity(data.selection.balanceQuantityKg)} кг</strong>
							{data.selection.balanceQuantityKg < 0 ? <small>Расхождение</small> : null}
						</div>
						<div>
							<span>Выручка</span>
							<strong>{formatRubles(data.selection.revenueCents)}</strong>
						</div>
						<div>
							<span>Затраты</span>
							<strong>{formatRubles(data.selection.expensesCents)}</strong>
						</div>
						<div>
							<span>Передано</span>
							<strong>{formatRubles(data.selection.transfersCents)}</strong>
						</div>
						<div>
							<span>Приход</span>
							<strong>{formatQuantity(data.selection.receivedQuantityKg)} кг</strong>
						</div>
						<div>
							<span>Продано</span>
							<strong>{formatQuantity(data.selection.quantityKg)} кг</strong>
						</div>
					</section>

					<div className="direct-accounting-desktop-panels">
						<DirectAccountingMoneyChart
							data={chartData}
							formatAxisMoney={formatChartAxisMoney}
							formatMoney={formatRubles}
						/>
						<DirectAccountingRecentOperations entries={entries} onOpenAll={onOpenAllOperations} />
					</div>

					<section className="direct-accounting-product-stats" aria-label="Остатки по товарам">
						<h2>Остатки по товарам</h2>
						<div className="direct-accounting-product-stats-head">
							<span>Наименование</span>
							<span>Приход</span>
							<span>Продано</span>
							<span>Выручка</span>
							<span>Остаток</span>
						</div>
						{data.byProduct.map((row) => (
							<div className="direct-accounting-product-stat" key={row.productName.toLocaleLowerCase("ru-RU")}>
								<div className="direct-accounting-product-stat-main">
									<strong>{row.productName}</strong>
									<small>Приход {formatQuantity(row.receivedQuantityKg)} кг · Продано {formatQuantity(row.quantityKg)} кг · {formatRubles(row.revenueCents)}</small>
								</div>
								<span className="direct-accounting-product-value">{formatQuantity(row.receivedQuantityKg)} кг</span>
								<span className="direct-accounting-product-value">{formatQuantity(row.quantityKg)} кг</span>
								<span className="direct-accounting-product-value">{formatRubles(row.revenueCents)}</span>
								<div className={row.balanceQuantityKg < 0 ? "direct-accounting-balance negative" : "direct-accounting-balance"}>
									<strong>{formatQuantity(row.balanceQuantityKg)} кг</strong>
									{row.balanceQuantityKg < 0 ? <small>Расхождение</small> : null}
								</div>
							</div>
						))}
						{data.byProduct.length === 0 ? <p className="director-dashboard-empty">Нет товарных операций и остатков</p> : null}
					</section>
				</>
			) : null}
		</div>
	);
}

function AccountingModeSwitch({
	directAccounting,
	onChange,
}: {
	directAccounting: boolean;
	onChange: (directAccounting: boolean) => void;
}) {
	return (
		<fieldset className="director-dashboard-mode-switch">
			<legend className="sr-only">Режим учета</legend>
			<button
				aria-pressed={!directAccounting}
				className={!directAccounting ? "active" : ""}
				onClick={() => onChange(false)}
				type="button"
			>
				Основной учет
			</button>
			<button
				aria-pressed={directAccounting}
				className={directAccounting ? "active" : ""}
				onClick={() => onChange(true)}
				type="button"
			>
				Прямой учет
			</button>
		</fieldset>
	);
}

function DirectAccountingRecentOperations({
	entries,
	onOpenAll,
}: {
	entries: DirectAccountingEntry[];
	onOpenAll: (() => void) | undefined;
}) {
	return (
		<section className="direct-accounting-recent-panel" aria-labelledby="direct-accounting-recent-title">
			<div className="direct-accounting-panel-heading">
				<div>
					<h2 id="direct-accounting-recent-title">Последние операции</h2>
				</div>
				{onOpenAll ? <button className="direct-accounting-open-all" onClick={onOpenAll} type="button">Все операции →</button> : null}
			</div>
			<div className="direct-accounting-recent-head" aria-hidden>
				<span>Дата</span>
				<span>Тип</span>
				<span>Описание</span>
				<span>Сумма / кол-во</span>
			</div>
			<div className="direct-accounting-recent-rows">
				{entries.slice(0, 7).map((entry) => (
					<div className="direct-accounting-recent-row" key={`${entry.kind}-${entry.id}`}>
						<time dateTime={entry.createdAt}>
							<span>{DIRECT_ACCOUNTING_DATE_FORMATTER.format(parseDateOnlyUtc(entry.occurredOn))}</span>
						</time>
						<strong className={entry.kind}>{directAccountingEntryLabel(entry.kind)}</strong>
						<span className="direct-accounting-recent-description">{directAccountingEntryDescription(entry)}</span>
						<b>{directAccountingEntryValue(entry)}</b>
					</div>
				))}
				{entries.length === 0 ? <p className="director-dashboard-empty">Операций за период нет</p> : null}
			</div>
		</section>
	);
}

function buildDirectAccountingChartData(
	entries: DirectAccountingEntry[],
	dateFrom: string,
	dateTo: string,
): DirectAccountingChartPoint[] {
	const daily = new Map<string, Pick<DirectAccountingChartPoint, "revenueCents" | "expensesCents" | "transfersCents">>();

	for (const entry of entries) {
		const current = daily.get(entry.occurredOn) ?? {
			revenueCents: 0,
			expensesCents: 0,
			transfersCents: 0,
		};
		daily.set(entry.occurredOn, {
			revenueCents: current.revenueCents + (entry.kind === "sale" ? entry.totalCents : 0),
			expensesCents: current.expensesCents + (entry.kind === "expense" ? entry.amountCents : 0),
			transfersCents: current.transfersCents + (entry.kind === "transfer" ? entry.amountCents : 0),
		});
	}

	const result: DirectAccountingChartPoint[] = [];
	for (let date = parseDateOnlyUtc(dateFrom); date <= parseDateOnlyUtc(dateTo); date = addUtcDay(date)) {
		const dateKey = date.toISOString().slice(0, 10);
		result.push({
			date: dateKey,
			label: ANALYTICS_CHART_DATE_FORMATTER.format(date),
			revenueCents: daily.get(dateKey)?.revenueCents ?? 0,
			expensesCents: daily.get(dateKey)?.expensesCents ?? 0,
			transfersCents: daily.get(dateKey)?.transfersCents ?? 0,
		});
	}

	return result;
}

function parseDateOnlyUtc(value: string): Date {
	return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDay(value: Date): Date {
	const next = new Date(value);
	next.setUTCDate(next.getUTCDate() + 1);
	return next;
}

function formatChartAxisMoney(value: number): string {
	const rubles = value / 100;
	if (Math.abs(rubles) >= 1_000_000) return `${ANALYTICS_CHART_THOUSANDS_FORMATTER.format(rubles / 1_000_000)} млн`;
	if (Math.abs(rubles) >= 1_000) return `${ANALYTICS_CHART_THOUSANDS_FORMATTER.format(rubles / 1_000)} тыс`;
	return ANALYTICS_CHART_INTEGER_FORMATTER.format(rubles);
}

function directAccountingEntryLabel(kind: DirectAccountingEntry["kind"]): string {
	if (kind === "sale") return "Продажа";
	if (kind === "receipt") return "Приход";
	if (kind === "expense") return "Затрата";
	return "Передача";
}

function directAccountingEntryDescription(entry: DirectAccountingEntry): string {
	if (entry.kind === "sale") return `${entry.productName}, ${formatQuantity(entry.quantityKg)} кг`;
	if (entry.kind === "receipt") return entry.productName;
	if (entry.kind === "expense") return entry.name;
	return entry.comment;
}

function directAccountingEntryValue(entry: DirectAccountingEntry): string {
	if (entry.kind === "sale") return formatRubles(entry.totalCents);
	if (entry.kind === "receipt") return `+${formatQuantity(entry.quantityKg)} кг`;
	return `−${formatRubles(entry.amountCents)}`;
}

function OverviewAnalytics({ data }: { data: DirectorAnalyticsResponse }) {
	const averageCheckCents = data.money.saleCount > 0
		? Math.round(data.money.grossRevenueCents / data.money.saleCount)
		: 0;

	return (
		<div className="director-dashboard-overview">
			<section className="director-dashboard-overview-section" aria-label="Показатели периода">
				<h2>Период</h2>
				<AnalyticsValueRow
					label="Средний чек"
					value={formatRubles(averageCheckCents)}
				/>
				<AnalyticsValueRow
					label="Продаж"
					value={formatQuantity(data.money.saleCount)}
				/>
				<AnalyticsValueRow
					label="Отменено"
					value={formatQuantity(data.money.cancellationCount)}
				/>
			</section>
			<section className="director-dashboard-overview-section" aria-label="Сырье за период">
				<h2>Сырье</h2>
				<AnalyticsValueRow
					label="Приход"
					value={formatRawMaterialTotal(data.production.rawMaterialIntakes)}
				/>
				<AnalyticsValueRow
					label="Расход"
					value={formatRawMaterialTotal(data.production.rawMaterialConsumed)}
				/>
				<AnalyticsValueRow
					label="Остаток"
					value={formatRawMaterialTotal(data.production.currentRawMaterialBalances)}
				/>
			</section>
		</div>
	);
}

function MoneySummary({ data }: { data: DirectorAnalyticsResponse }) {
	return (
		<section className="director-dashboard-money-card" aria-label="Деньги">
			<div className="director-dashboard-money-primary">
				<MetricBlock
					icon={<Banknote aria-hidden size={20} />}
					label="Выручка"
					valueCents={data.money.netRevenueCents}
					detail={formatCount(data.money.saleCount, "продажа", "продажи", "продаж")}
				/>
				<div className="director-dashboard-money-breakdown director-dashboard-revenue-breakdown">
					<AnalyticsValueRow
						label="Наличными"
						value={formatRubles(data.money.cashRevenueCents)}
					/>
					<AnalyticsValueRow
						label="Безналом"
						value={formatRubles(data.money.cashlessRevenueCents)}
					/>
				</div>
			</div>
			<div className="director-dashboard-money-secondary">
				<MetricBlock
					icon={<Vault aria-hidden size={20} />}
					label="Касса"
					valueCents={data.money.currentCash.totalCashCents}
					detail="Наличные сейчас"
				/>
				<div className="director-dashboard-money-breakdown">
					<AnalyticsValueRow
						label="Распределитель"
						value={formatRubles(data.money.currentCash.distributorCashCents)}
					/>
					<AnalyticsValueRow
						label="Курьеры"
						value={formatRubles(data.money.currentCash.courierCashCents)}
					/>
				</div>
			</div>
		</section>
	);
}

function MoneyAnalytics({ data }: { data: DirectorAnalyticsResponse }) {
	return (
		<RevenueTrendChart points={data.charts.revenueByDay} />
	);
}

function ProductionFlowStrip({ data }: { data: DirectorAnalyticsResponse }) {
	return (
		<div className="director-dashboard-production-strip">
			<div className="director-dashboard-production-icon">
				<Factory aria-hidden size={24} />
			</div>
			<FlowValue
				label="Выпуск"
				value={formatProductQuantityLabel({
					quantity: data.production.summary.productReleasedUnits,
					totalNetWeightGrams: data.production.summary.productReleasedTotalNetWeightGrams,
				})}
			/>
			<FlowValue
				label="Распределитель"
				value={formatProductQuantityLabel({
					quantity: data.production.productTransferredToDistributorUnits,
					totalNetWeightGrams: data.production.productTransferredToDistributorTotalNetWeightGrams,
				})}
			/>
			<FlowValue
				label="Цех"
				value={formatProductQuantityLabel({
					quantity: data.production.currentWorkshopProductUnits,
					totalNetWeightGrams: data.production.currentWorkshopProductTotalNetWeightGrams,
				})}
			/>
		</div>
	);
}

function FlowValue({ label, value }: { label: string; value: string }) {
	return (
		<div className="director-dashboard-strip-value">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function MetricBlock({
	detail,
	icon,
	label,
	valueCents,
}: {
	detail: string;
	icon: ReactNode;
	label: string;
	valueCents: number;
}) {
	return (
		<div className="director-dashboard-metric">
			<div className="director-dashboard-metric-label">
				{icon}
				<span>{label}</span>
			</div>
			<MoneyValue cents={valueCents} />
			<p>{detail}</p>
		</div>
	);
}

function MoneyValue({ cents }: { cents: number }) {
	const sign = cents < 0 ? "-" : "";
	const value = `${sign}${formatCompactMoneyCents(Math.abs(cents))}`;

	return (
		<strong className="director-dashboard-money-value">
			<span>{value}</span>
			<small aria-hidden>₽</small>
			<span className="sr-only"> рублей</span>
		</strong>
	);
}

function RevenueTrendChart({ points }: { points: DirectorAnalyticsRevenueByDayPoint[] }) {
	const titleId = useId();
	const gradientId = `${titleId.replace(/:/g, "")}-gradient`;
	const width = 320;
	const height = 150;
	const geometry = buildRevenueChartGeometry(points, width, height);
	const firstPoint = points[0];
	const lastPoint = points.at(-1);
	const showPointMarkers = points.length > 1 && points.length <= 45;

	return (
		<div className="director-dashboard-sparkline" aria-labelledby={titleId}>
			<div className="director-dashboard-sparkline-head">
				<h2 id={titleId}>Выручка по дням</h2>
				<strong>{points.length ? `${points.length} дн.` : "Нет данных"}</strong>
			</div>
			{geometry ? (
				<>
					<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId} preserveAspectRatio="none">
						<defs>
							<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stopColor="var(--brand-green)" stopOpacity="0.18" />
								<stop offset="100%" stopColor="var(--brand-green)" stopOpacity="0" />
							</linearGradient>
						</defs>
						<g className="director-dashboard-chart-grid">
							{geometry.gridLines.map((line) => (
								<g key={line.label}>
									<line x1={geometry.plot.left} x2={geometry.plot.right} y1={line.y} y2={line.y} />
									<text x={geometry.plot.left - 7} y={line.y}>{line.label}</text>
								</g>
							))}
						</g>
						{geometry.areaPath ? (
							<path className="director-dashboard-sparkline-area" d={geometry.areaPath} fill={`url(#${gradientId})`} />
						) : null}
						{geometry.linePath ? (
							<path className="director-dashboard-sparkline-line" d={geometry.linePath} />
						) : null}
						{showPointMarkers ? geometry.points.map((point) => (
							<circle className="director-dashboard-chart-dot" cx={point.x} cy={point.y} key={point.date} r="2.3" />
						)) : null}
						{geometry.lastPoint ? (
							<circle
								className="director-dashboard-chart-last-dot"
								cx={geometry.lastPoint.x}
								cy={geometry.lastPoint.y}
								r="4"
							/>
						) : null}
					</svg>
					{firstPoint && lastPoint ? (
						<div className="director-dashboard-chart-axis" aria-hidden>
							<span>{formatChartDate(firstPoint.date)}</span>
							<span>{formatChartDate(lastPoint.date)}</span>
						</div>
					) : null}
				</>
			) : (
				<p className="director-dashboard-empty">Нет продаж за период</p>
			)}
		</div>
	);
}

function RawMaterialSummary({ rows }: { rows: RawMaterialSummaryRow[] }) {
	return (
		<div className="director-dashboard-material-table">
			<h2>Сырье</h2>
			<div className="director-dashboard-material-head" aria-hidden>
				<span>Наименование</span>
				<span>Приход</span>
				<span>Расход</span>
				<span>Остаток</span>
			</div>
			{rows.length ? rows.map((row) => (
				<div className="director-dashboard-material-row" key={row.rawMaterialTypeId}>
					<strong>{row.rawMaterialName}</strong>
					<span>{formatQuantity(row.intakeQuantity)} {row.unit}</span>
					<span>{formatQuantity(row.consumedQuantity)} {row.unit}</span>
					<span>{formatQuantity(row.balanceQuantity)} {row.unit}</span>
				</div>
			)) : <p className="director-dashboard-empty">Нет данных по сырью</p>}
		</div>
	);
}

function ProductList({ rows }: { rows: DirectorAnalyticsProductOutputRow[] }) {
	return (
		<div className="director-dashboard-product-table">
			<h2>Продукция</h2>
			<div className="director-dashboard-product-head" aria-hidden>
				<span>Наименование</span>
				<span>Количество</span>
				<span>Сырье на 1 шт</span>
			</div>
			{rows.length ? rows.map((row) => (
				<div className="director-dashboard-product-row" key={row.productName}>
					<strong>{row.productName}</strong>
					<strong>{formatProductQuantityLabel({
						quantity: row.quantity,
						totalNetWeightGrams: row.totalNetWeightGrams,
					})}</strong>
					<span>{formatRawMaterialPerUnit(row)}</span>
				</div>
			)) : <p className="director-dashboard-empty">Нет выпуска за период</p>}
		</div>
	);
}

function AnalyticsValueRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="director-dashboard-value-row">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function AnalyticsSkeleton() {
	return (
		<div className="director-dashboard-skeleton" aria-label="Загрузка аналитики">
			<span />
			<span />
			<span />
		</div>
	);
}

function formatRubles(priceCents: number): string {
	const sign = priceCents < 0 ? "-" : "";
	return `${sign}${formatCompactMoneyCents(Math.abs(priceCents))} ₽`;
}

function formatQuantity(value: number): string {
	return ANALYTICS_QUANTITY_FORMATTER.format(value);
}

function formatRawMaterialTotal(rows: DirectorAnalyticsRawMaterialRow[]): string {
	if (!rows.length) {
		return "0";
	}

	const totalsByUnit = new Map<string, number>();
	for (const row of rows) {
		totalsByUnit.set(row.unit, (totalsByUnit.get(row.unit) ?? 0) + row.quantity);
	}

	return Array.from(totalsByUnit.entries())
		.map(([unit, quantity]) => `${formatQuantity(quantity)} ${unit}`)
		.join(" / ");
}

function formatPeriodRange(dateFrom: string, dateTo: string): string {
	const inclusiveDateTo = new Date(new Date(dateTo).getTime() - 1);
	return `${ANALYTICS_PERIOD_RANGE_FORMATTER.format(new Date(dateFrom))} - ${ANALYTICS_PERIOD_RANGE_FORMATTER.format(inclusiveDateTo)}`;
}

function formatDirectAccountingRange(dateFrom: string, dateTo: string): string {
	const formattedFrom = ANALYTICS_PERIOD_RANGE_FORMATTER.format(new Date(`${dateFrom}T00:00:00.000Z`));
	if (dateFrom === dateTo) {
		return formattedFrom;
	}
	const formattedTo = ANALYTICS_PERIOD_RANGE_FORMATTER.format(new Date(`${dateTo}T00:00:00.000Z`));
	return `${formattedFrom} - ${formattedTo}`;
}

function formatBusinessDateInputValue(value: string): string {
	const parts = Object.fromEntries(
		ANALYTICS_BUSINESS_DATE_INPUT_FORMATTER.formatToParts(new Date(value))
			.map((part) => [part.type, part.value]),
	);

	return `${parts.year}-${parts.month}-${parts.day}`;
}

function validateCustomPeriod(dateFrom: string, dateTo: string): string | null {
	if (!dateFrom || !dateTo) {
		return "Укажите начало и конец периода.";
	}

	const from = new Date(`${dateFrom}T00:00:00.000Z`);
	const to = new Date(`${dateTo}T00:00:00.000Z`);

	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
		return "Проверьте даты периода.";
	}

	if (to.getTime() < from.getTime()) {
		return "Дата окончания должна быть не раньше даты начала.";
	}

	const inclusiveDays = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
	if (inclusiveDays > ANALYTICS_MAX_RANGE_DAYS) {
		return "Период не должен быть больше 366 дней.";
	}

	return null;
}

function buildRevenueChartGeometry(
	points: DirectorAnalyticsRevenueByDayPoint[],
	width: number,
	height: number,
): RevenueChartGeometry | null {
	if (!points.length) {
		return null;
	}

	const plot = {
		bottom: height - 18,
		left: 68,
		right: width - 8,
		top: 10,
	};
	const plotWidth = plot.right - plot.left;
	const plotHeight = plot.bottom - plot.top;
	const values = points.map((point) => point.netRevenueCents);
	const minValue = Math.min(...values);
	const maxValue = Math.max(...values);
	const spread = maxValue - minValue;
	const domainPadding = spread === 0
		? Math.max(Math.abs(maxValue) * 0.2, 100)
		: Math.max(spread * 0.16, 100);
	let domainMin = minValue - domainPadding;
	let domainMax = maxValue + domainPadding;

	if (minValue >= 0) {
		domainMin = Math.max(0, domainMin);
	}
	if (maxValue <= 0) {
		domainMax = Math.min(0, domainMax);
	}
	if (domainMax === domainMin) {
		domainMax += 100;
		domainMin -= 100;
	}

	const valueToY = (value: number) => (
		plot.top + ((domainMax - value) / (domainMax - domainMin)) * plotHeight
	);
	const chartPoints = points.map((point, index) => ({
		date: point.date,
		value: point.netRevenueCents,
		x: points.length === 1 ? plot.left + plotWidth / 2 : plot.left + (index / (points.length - 1)) * plotWidth,
		y: valueToY(point.netRevenueCents),
	}));
	const firstPoint = chartPoints[0];
	if (!firstPoint) {
		return null;
	}

	const lastPoint = chartPoints.at(-1) ?? firstPoint;
	const linePath = chartPoints.length === 1
		? buildSinglePointPath(firstPoint)
		: buildSmoothChartPath(chartPoints);
	const areaPath = `${linePath} L ${formatSvgNumber(lastPoint.x)} ${plot.bottom} L ${formatSvgNumber(firstPoint.x)} ${plot.bottom} Z`;

	return {
		areaPath,
		gridLines: buildRevenueGridLines(domainMin, domainMax, valueToY),
		lastPoint,
		linePath,
		plot: {
			left: plot.left,
			right: plot.right,
		},
		points: chartPoints,
	};
}

function buildRevenueGridLines(
	domainMin: number,
	domainMax: number,
	valueToY: (value: number) => number,
): Array<{ label: string; y: number }> {
	const values = [
		domainMax,
		domainMin + (domainMax - domainMin) / 2,
		domainMin,
	];

	const lines: Array<{ label: string; y: number }> = [];
	const seenLabels = new Set<string>();
	for (const value of values) {
		const label = formatChartMoneyLabel(value);
		if (seenLabels.has(label)) {
			continue;
		}

		seenLabels.add(label);
		lines.push({
			label,
			y: valueToY(value),
		});
	}

	return lines;
}

function buildSinglePointPath(point: RevenueChartPoint): string {
	const startX = point.x - 22;
	const endX = point.x + 22;
	return `M ${formatSvgNumber(startX)} ${formatSvgNumber(point.y)} C ${formatSvgNumber(point.x - 8)} ${formatSvgNumber(point.y)}, ${formatSvgNumber(point.x + 8)} ${formatSvgNumber(point.y)}, ${formatSvgNumber(endX)} ${formatSvgNumber(point.y)}`;
}

function buildSmoothChartPath(points: RevenueChartPoint[]): string {
	const [firstPoint] = points;
	if (!firstPoint) {
		return "";
	}

	const commands = [`M ${formatSvgNumber(firstPoint.x)} ${formatSvgNumber(firstPoint.y)}`];

	for (let index = 0; index < points.length - 1; index += 1) {
		const current = points[index];
		const next = points[index + 1];
		if (!current || !next) {
			continue;
		}

		const previous = points[index - 1] ?? current;
		const afterNext = points[index + 2] ?? next;
		const controlOne = {
			x: current.x + (next.x - previous.x) / 6,
			y: current.y + (next.y - previous.y) / 6,
		};
		const controlTwo = {
			x: next.x - (afterNext.x - current.x) / 6,
			y: next.y - (afterNext.y - current.y) / 6,
		};

		commands.push(
			`C ${formatSvgNumber(controlOne.x)} ${formatSvgNumber(controlOne.y)}, ${formatSvgNumber(controlTwo.x)} ${formatSvgNumber(controlTwo.y)}, ${formatSvgNumber(next.x)} ${formatSvgNumber(next.y)}`,
		);
	}

	return commands.join(" ");
}

function formatChartMoneyLabel(value: number): string {
	const roundedCents = Math.round(value);
	const sign = roundedCents < 0 ? "-" : "";
	const rubles = Math.abs(roundedCents) / 100;

	if (rubles >= 1000) {
		return `${sign}${ANALYTICS_CHART_THOUSANDS_FORMATTER.format(rubles / 1000)} тыс.`;
	}

	return `${sign}${ANALYTICS_CHART_INTEGER_FORMATTER.format(rubles)}`;
}

function formatChartDate(value: string): string {
	return ANALYTICS_CHART_DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
}

function formatSvgNumber(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatRawMaterialPerUnit(row: DirectorAnalyticsProductOutputRow): string {
	const quantityPerUnit = row.quantity > 0 ? row.rawMaterialConsumedQuantity / row.quantity : 0;
	return `${formatQuantity(quantityPerUnit)} ${row.rawMaterialUnit}/шт`;
}

function buildRawMaterialSummaryRows(production: DirectorAnalyticsResponse["production"]): RawMaterialSummaryRow[] {
	const rows = new Map<string, RawMaterialSummaryRow>();

	for (const row of production.rawMaterialIntakes) {
		getRawMaterialSummaryRow(rows, row).intakeQuantity += row.quantity;
	}
	for (const row of production.rawMaterialConsumed) {
		getRawMaterialSummaryRow(rows, row).consumedQuantity += row.quantity;
	}
	for (const row of production.currentRawMaterialBalances) {
		getRawMaterialSummaryRow(rows, row).balanceQuantity += row.quantity;
	}

	return Array.from(rows.values()).sort((left, right) => (
		right.consumedQuantity + right.intakeQuantity + right.balanceQuantity
	) - (
		left.consumedQuantity + left.intakeQuantity + left.balanceQuantity
	));
}

function getRawMaterialSummaryRow(rows: Map<string, RawMaterialSummaryRow>, row: DirectorAnalyticsRawMaterialRow) {
	const current = rows.get(row.rawMaterialTypeId);
	if (current) {
		return current;
	}

	const next = {
		rawMaterialTypeId: row.rawMaterialTypeId,
		rawMaterialName: row.rawMaterialName,
		unit: row.unit,
		intakeQuantity: 0,
		consumedQuantity: 0,
		balanceQuantity: 0,
	};
	rows.set(row.rawMaterialTypeId, next);
	return next;
}

function formatCount(value: number, one: string, few: string, many: string): string {
	const lastTwo = value % 100;
	const lastOne = value % 10;
	const word = lastTwo >= 11 && lastTwo <= 14
		? many
		: lastOne === 1
			? one
			: lastOne >= 2 && lastOne <= 4
				? few
				: many;
	return `${value} ${word}`;
}
