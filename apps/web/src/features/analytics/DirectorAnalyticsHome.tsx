"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, Factory, RefreshCw, WalletCards } from "lucide-react";
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
import { SegmentedControl } from "../../ui/SegmentedControl";

const PERIOD_OPTIONS: Array<{ value: DirectorAnalyticsPeriodPreset; label: string }> = [
	{ value: "today", label: "Сегодня" },
	{ value: "7d", label: "7 дней" },
	{ value: "30d", label: "30 дней" },
	{ value: "90d", label: "90 дней" },
];

const VIEW_OPTIONS = [
	{ value: "overview", label: "Обзор" },
	{ value: "money", label: "Деньги" },
	{ value: "production", label: "Производство" },
] as const;

type AnalyticsViewMode = typeof VIEW_OPTIONS[number]["value"];

type RawMaterialSummaryRow = {
	rawMaterialTypeId: string;
	rawMaterialName: string;
	unit: string;
	intakeQuantity: number;
	consumedQuantity: number;
	balanceQuantity: number;
};

export function DirectorAnalyticsHome({ title = "Аналитика" }: { title?: string } = {}) {
	const [periodPreset, setPeriodPreset] = useState<DirectorAnalyticsPeriodPreset>("30d");
	const [viewMode, setViewMode] = useState<AnalyticsViewMode>("overview");
	const analytics = useQuery({
		queryKey: ["analytics", "director", periodPreset],
		queryFn: () => getDirectorAnalytics({ periodPreset }),
	});

	return (
		<section className="screen-stack director-home analytics-home">
			<div className="director-analytics-header">
				<div>
					<h1>{title}</h1>
					{analytics.data ? (
						<p>{formatPeriodRange(analytics.data.filters.dateFrom, analytics.data.filters.dateTo)}</p>
					) : null}
				</div>
				{analytics.isFetching ? (
					<span className="analytics-sync" aria-label="Обновление">
						<RefreshCw aria-hidden size={16} />
					</span>
				) : null}
			</div>

			<SegmentedControl
				ariaLabel="Период аналитики"
				className="analytics-period-control"
				items={PERIOD_OPTIONS}
				onChange={setPeriodPreset}
				role="group"
				value={periodPreset}
			/>

			<SegmentedControl
				ariaLabel="Раздел аналитики"
				className="analytics-view-tabs"
				items={VIEW_OPTIONS}
				onChange={setViewMode}
				value={viewMode}
			/>

			{analytics.isError ? (
				<div className="analytics-message error">
					<AlertTriangle aria-hidden size={18} />
					<span>Не удалось загрузить аналитику.</span>
					<button type="button" onClick={() => void analytics.refetch()}>
						Повторить
					</button>
				</div>
			) : null}

			{analytics.data ? <DirectorAnalyticsView data={analytics.data} viewMode={viewMode} /> : null}
			{analytics.isLoading ? <AnalyticsSkeleton /> : null}
		</section>
	);
}

function DirectorAnalyticsView({ data, viewMode }: { data: DirectorAnalyticsResponse; viewMode: AnalyticsViewMode }) {
	const rawMaterialRows = useMemo(
		() => buildRawMaterialSummaryRows(data.production),
		[data.production],
	);

	if (viewMode === "money") {
		return <MoneyAnalytics data={data} />;
	}

	if (viewMode === "production") {
		return <ProductionAnalytics data={data} rawMaterialRows={rawMaterialRows} />;
	}

	return (
		<>
			<AnalyticsSection title="За период" meta={getPeriodLabel(data.filters.periodPreset)}>
				<div className="analytics-summary-grid">
					<MetricBlock
						icon={<WalletCards aria-hidden size={18} />}
						label="Выручка"
						value={formatRubles(data.money.netRevenueCents)}
						detail={formatCount(data.money.saleCount, "продажа", "продажи", "продаж")}
					/>
					<MetricBlock
						icon={<Factory aria-hidden size={18} />}
						label="Выпуск"
						value={`${formatQuantity(data.production.summary.productReleasedUnits)} шт`}
						detail={`Сырье: ${formatQuantity(data.production.summary.rawMaterialConsumedQuantity)} ${data.production.summary.rawMaterialConsumedUnit}`}
					/>
				</div>
			</AnalyticsSection>

			<AnalyticsSection title="Сейчас">
				<div className="analytics-current-cash">
					<MetricBlock
						icon={<Banknote aria-hidden size={18} />}
						label="Наличные"
						value={formatRubles(data.money.currentCash.totalCashCents)}
						detail="Распределитель и курьеры"
					/>
					<div className="analytics-ledger-list">
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
			</AnalyticsSection>
		</>
	);
}

function MoneyAnalytics({ data }: { data: DirectorAnalyticsResponse }) {
	return (
		<>
			<AnalyticsSection title="Выручка" meta={getPeriodLabel(data.filters.periodPreset)}>
				<div className="analytics-revenue-panel">
					<MetricBlock
						icon={<WalletCards aria-hidden size={18} />}
						label="Итого"
						value={formatRubles(data.money.netRevenueCents)}
						detail={formatCount(data.money.saleCount, "продажа", "продажи", "продаж")}
					/>
					<RevenueSparkline points={data.charts.revenueByDay} />
				</div>
			</AnalyticsSection>

			<AnalyticsSection title="Оплата за период">
				<div className="analytics-money-split">
					<SmallPanel label="Наличные" value={formatRubles(data.money.cashRevenueCents)} />
					<SmallPanel label="Безнал" value={formatRubles(data.money.cashlessRevenueCents)} />
				</div>
			</AnalyticsSection>

			<AnalyticsSection title="Сейчас">
				<div className="analytics-ledger-list">
					<AnalyticsValueRow
						label="Распределитель"
						value={formatRubles(data.money.currentCash.distributorCashCents)}
					/>
					<AnalyticsValueRow
						label="Курьеры"
						value={formatRubles(data.money.currentCash.courierCashCents)}
					/>
					<AnalyticsValueRow
						label="Наличные всего"
						value={formatRubles(data.money.currentCash.totalCashCents)}
					/>
				</div>
			</AnalyticsSection>
		</>
	);
}

function ProductionAnalytics({
	data,
	rawMaterialRows,
}: {
	data: DirectorAnalyticsResponse;
	rawMaterialRows: RawMaterialSummaryRow[];
}) {
	return (
		<>
			<AnalyticsSection title="За период" meta={getPeriodLabel(data.filters.periodPreset)}>
				<div className="analytics-summary-grid">
					<SmallPanel
						label="Выпущено"
						value={`${formatQuantity(data.production.summary.productReleasedUnits)} шт`}
					/>
					<SmallPanel
						label="Сырье в продукт"
						value={`${formatQuantity(data.production.summary.rawMaterialConsumedQuantity)} ${data.production.summary.rawMaterialConsumedUnit}`}
					/>
					<SmallPanel
						label="На распределитель"
						value={`${formatQuantity(data.production.productTransferredToDistributorUnits)} шт`}
					/>
				</div>
			</AnalyticsSection>

			<AnalyticsSection title="Сырье">
				<RawMaterialSummary rows={rawMaterialRows} />
			</AnalyticsSection>

			<AnalyticsSection title="Продукция">
				<ProductList rows={data.production.productReleased} />
				<div className="analytics-ledger-list">
					<AnalyticsValueRow
						label="Остаток в цеху"
						value={`${formatQuantity(data.production.currentWorkshopProductUnits)} шт`}
					/>
				</div>
			</AnalyticsSection>
		</>
	);
}

function AnalyticsSection({
	children,
	meta,
	title,
}: {
	children: ReactNode;
	meta?: string;
	title: string;
}) {
	return (
		<section className="analytics-focus-panel">
			<div className="analytics-section-head">
				<h2>{title}</h2>
				{meta ? <span>{meta}</span> : null}
			</div>
			{children}
		</section>
	);
}

function MetricBlock({
	detail,
	icon,
	label,
	value,
}: {
	detail: string;
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="analytics-kpi">
			<div className="analytics-kpi-label">
				{icon}
				<span>{label}</span>
			</div>
			<strong>{value}</strong>
			<p>{detail}</p>
		</div>
	);
}

function SmallPanel({ label, value }: { label: string; value: string }) {
	return (
		<div className="analytics-small-panel">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function RevenueSparkline({ points }: { points: DirectorAnalyticsRevenueByDayPoint[] }) {
	const id = useId();
	const values = points.map((point) => point.netRevenueCents);
	const width = 240;
	const height = 72;
	const path = buildSparklinePath(values, width, height);
	const areaPath = path ? `${path} L ${width} ${height} L 0 ${height} Z` : "";

	return (
		<div className="analytics-sparkline" aria-labelledby={id}>
			<div className="analytics-sparkline-head">
				<span id={id}>Динамика по дням</span>
				<strong>{points.length ? `${points.length} дн.` : "Нет данных"}</strong>
			</div>
			{path ? (
				<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={id} preserveAspectRatio="none">
					<path className="analytics-sparkline-area" d={areaPath} />
					<path className="analytics-sparkline-line" d={path} />
				</svg>
			) : (
				<p className="analytics-empty">Недостаточно данных для графика</p>
			)}
		</div>
	);
}

function RawMaterialSummary({ rows }: { rows: RawMaterialSummaryRow[] }) {
	return (
		<div className="analytics-material-list">
			{rows.length ? rows.map((row) => (
				<div className="analytics-material-row" key={row.rawMaterialTypeId}>
					<div>
						<strong>{row.rawMaterialName}</strong>
						<span>{row.unit}</span>
					</div>
					<div className="analytics-material-values">
						<SmallValue label="Приход" value={formatQuantity(row.intakeQuantity)} />
						<SmallValue label="Расход" value={formatQuantity(row.consumedQuantity)} />
						<SmallValue label="Остаток" value={formatQuantity(row.balanceQuantity)} />
					</div>
				</div>
			)) : <p className="analytics-empty">Нет данных по сырью</p>}
		</div>
	);
}

function ProductList({ rows }: { rows: DirectorAnalyticsProductOutputRow[] }) {
	return (
		<div className="analytics-product-list">
			{rows.length ? rows.map((row) => (
				<AnalyticsValueRow
					key={row.productName}
					label={row.productName}
					value={`${formatQuantity(row.quantity)} шт · сырье ${formatQuantity(row.rawMaterialConsumedQuantity)} ${row.rawMaterialUnit}`}
				/>
			)) : <p className="analytics-empty">Нет выпуска за период</p>}
		</div>
	);
}

function SmallValue({ label, value }: { label: string; value: string }) {
	return (
		<span>
			<small>{label}</small>
			<strong>{value}</strong>
		</span>
	);
}

function AnalyticsValueRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="analytics-value-row">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function AnalyticsSkeleton() {
	return (
		<div className="analytics-skeleton" aria-label="Загрузка аналитики">
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

function formatPeriodRange(dateFrom: string, dateTo: string): string {
	const formatter = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "short",
		timeZone: "Asia/Vladivostok",
	});
	const inclusiveDateTo = new Date(new Date(dateTo).getTime() - 1);
	return `${formatter.format(new Date(dateFrom))} - ${formatter.format(inclusiveDateTo)}`;
}

function buildSparklinePath(values: number[], width: number, height: number): string {
	if (values.length < 2) {
		return "";
	}

	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const step = width / (values.length - 1);

	return values.map((value, index) => {
		const x = index * step;
		const y = height - ((value - min) / range) * (height - 8) - 4;
		return `${index === 0 ? "M" : "L"} ${formatChartNumber(x)} ${formatChartNumber(y)}`;
	}).join(" ");
}

function formatChartNumber(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(2);
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

function getPeriodLabel(periodPreset: DirectorAnalyticsPeriodPreset): string {
	return PERIOD_OPTIONS.find((option) => option.value === periodPreset)?.label ?? "Период";
}
