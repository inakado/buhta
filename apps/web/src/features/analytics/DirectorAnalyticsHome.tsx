"use client";

import { useQuery } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { AlertTriangle, Banknote, CalendarDays, ChevronDown, Clock3, Factory, RefreshCw, Vault, WalletCards } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
	type DirectorAnalyticsPeriodPreset,
	type DirectorAnalyticsProductOutputRow,
	type DirectorAnalyticsRawMaterialRow,
	type DirectorAnalyticsRevenueByDayPoint,
	type DirectorAnalyticsResponse,
} from "@buhta/shared";
import { getDirectorAnalytics } from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { DateRangePickerPanel } from "../../ui/DateRangePickerPanel";
import { SegmentedControl } from "../../ui/SegmentedControl";

const PERIOD_OPTIONS: Array<{ value: DirectorAnalyticsPeriodPreset; label: string }> = [
	{ value: "today", label: "Сегодня" },
	{ value: "7d", label: "7 дней" },
	{ value: "30d", label: "30 дней" },
	{ value: "90d", label: "90 дней" },
];
const ANALYTICS_MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const VIEW_OPTIONS = [
	{ value: "overview", label: "Обзор", icon: Clock3 },
	{ value: "money", label: "Деньги", icon: WalletCards },
	{ value: "production", label: "Производство", icon: Factory },
] as const;

type AnalyticsViewMode = typeof VIEW_OPTIONS[number]["value"];

type DirectorPeriodSelection =
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

export function DirectorAnalyticsHome({ title = "Аналитика" }: { title?: string } = {}) {
	const [periodSelection, setPeriodSelection] = useState<DirectorPeriodSelection>({
		mode: "preset",
		periodPreset: "30d",
	});
	const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
	const [customDateFrom, setCustomDateFrom] = useState("");
	const [customDateTo, setCustomDateTo] = useState("");
	const [customPeriodError, setCustomPeriodError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<AnalyticsViewMode>("production");
	const analyticsQuery = useMemo(() => {
		if (periodSelection.mode === "custom") {
			return {
				dateFrom: periodSelection.dateFrom,
				dateTo: periodSelection.dateTo,
			};
		}

		return { periodPreset: periodSelection.periodPreset };
	}, [periodSelection]);
	const analytics = useQuery({
		queryKey: ["analytics", "director", analyticsQuery],
		queryFn: () => getDirectorAnalytics(analyticsQuery),
	});

	function selectPresetPeriod(periodPreset: DirectorAnalyticsPeriodPreset) {
		setPeriodSelection({ mode: "preset", periodPreset });
		setCustomPeriodError(null);
		setPeriodPickerOpen(false);
	}

	function setPeriodPickerOpenState(open: boolean) {
		if (open && analytics.data) {
			setCustomDateFrom(formatBusinessDateInputValue(analytics.data.filters.dateFrom));
			setCustomDateTo(formatBusinessDateInputValue(
				new Date(new Date(analytics.data.filters.dateTo).getTime() - 1).toISOString(),
			));
			setCustomPeriodError(null);
		}
		setPeriodPickerOpen(open);
	}

	function applyCustomPeriod() {
		const validationError = validateCustomPeriod(customDateFrom, customDateTo);
		if (validationError) {
			setCustomPeriodError(validationError);
			return;
		}

		setPeriodSelection({
			mode: "custom",
			dateFrom: customDateFrom,
			dateTo: customDateTo,
		});
		setCustomPeriodError(null);
		setPeriodPickerOpen(false);
	}

	return (
		<section className="screen-stack director-home director-dashboard">
			<div className="director-dashboard-topbar">
				<div className="director-dashboard-header">
					<h1>{title}</h1>
					{analytics.data ? (
						<Popover.Root open={periodPickerOpen} onOpenChange={setPeriodPickerOpenState}>
							<Popover.Trigger asChild>
								<button
									aria-controls="director-dashboard-period-picker"
									aria-expanded={periodPickerOpen}
									className="director-dashboard-date"
									type="button"
								>
									<CalendarDays aria-hidden size={18} />
									<span>{formatPeriodRange(analytics.data.filters.dateFrom, analytics.data.filters.dateTo)}</span>
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
									onChange={({ dateFrom, dateTo }) => {
										setCustomDateFrom(dateFrom);
										setCustomDateTo(dateTo);
										setCustomPeriodError(null);
									}}
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
					{analytics.isFetching ? (
						<span className="director-dashboard-sync" aria-label="Обновление">
							<RefreshCw aria-hidden size={16} />
						</span>
					) : null}
				</div>

				<SegmentedControl
					ariaLabel="Период аналитики"
					className="director-dashboard-period-control"
					items={PERIOD_OPTIONS}
					onChange={selectPresetPeriod}
					role="group"
					value={periodSelection.mode === "preset" ? periodSelection.periodPreset : null}
				/>
			</div>

			<div className="director-dashboard-body">
				{analytics.isError ? (
					<div className="director-dashboard-message error">
						<AlertTriangle aria-hidden size={18} />
						<span>Не удалось загрузить аналитику.</span>
						<button type="button" onClick={() => void analytics.refetch()}>
							Повторить
						</button>
					</div>
				) : null}

				{analytics.data ? (
					<DirectorAnalyticsView
						data={analytics.data}
						onViewModeChange={setViewMode}
						viewMode={viewMode}
					/>
				) : null}
				{analytics.isLoading ? <AnalyticsSkeleton /> : null}
			</div>
		</section>
	);
}

function DirectorAnalyticsView({
	data,
	onViewModeChange,
	viewMode,
}: {
	data: DirectorAnalyticsResponse;
	onViewModeChange: (value: AnalyticsViewMode) => void;
	viewMode: AnalyticsViewMode;
}) {
	const rawMaterialRows = useMemo(
		() => buildRawMaterialSummaryRows(data.production),
		[data.production],
	);

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
	onViewModeChange: (value: AnalyticsViewMode) => void;
	rawMaterialRows: RawMaterialSummaryRow[];
	viewMode: AnalyticsViewMode;
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
				value={formatQuantity(data.production.summary.productReleasedUnits)}
			/>
			<FlowValue
				label="Распределитель"
				value={formatQuantity(data.production.productTransferredToDistributorUnits)}
			/>
			<FlowValue
				label="Цех"
				value={formatQuantity(data.production.currentWorkshopProductUnits)}
			/>
		</div>
	);
}

function FlowValue({ label, unit = "шт", value }: { label: string; unit?: string; value: string }) {
	return (
		<div className="director-dashboard-strip-value">
			<span>{label}</span>
			<strong>
				<span>{value}</span>
				<small>{unit}</small>
			</strong>
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
					<strong>{formatQuantity(row.quantity)} шт</strong>
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
	return new Intl.NumberFormat("ru-RU", {
		maximumFractionDigits: 3,
	}).format(value);
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
	const formatter = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "short",
		timeZone: "Asia/Vladivostok",
	});
	const inclusiveDateTo = new Date(new Date(dateTo).getTime() - 1);
	return `${formatter.format(new Date(dateFrom))} - ${formatter.format(inclusiveDateTo)}`;
}

function formatBusinessDateInputValue(value: string): string {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "Asia/Vladivostok",
		year: "numeric",
	});
	const parts = Object.fromEntries(
		formatter.formatToParts(new Date(value))
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

	return values.map((value) => ({
		label: formatChartMoneyLabel(value),
		y: valueToY(value),
	})).filter((line, index, lines) => (
		lines.findIndex((candidate) => candidate.label === line.label) === index
	));
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
		return `${sign}${new Intl.NumberFormat("ru-RU", {
			maximumFractionDigits: 1,
		}).format(rubles / 1000)} тыс.`;
	}

	return `${sign}${new Intl.NumberFormat("ru-RU", {
		maximumFractionDigits: 0,
	}).format(rubles)}`;
}

function formatChartDate(value: string): string {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "short",
		timeZone: "Asia/Vladivostok",
	}).format(new Date(`${value}T00:00:00.000Z`));
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
