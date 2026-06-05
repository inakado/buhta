"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, Factory, RefreshCw, WalletCards } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
	formatMoneyCents,
	moneyCents,
	type DirectorAnalyticsPeriodPreset,
	type DirectorAnalyticsProductOutputRow,
	type DirectorAnalyticsRawMaterialRow,
	type DirectorAnalyticsResponse,
} from "@buhta/shared";
import { getDirectorAnalytics } from "../../lib/api-client";

const PERIOD_OPTIONS: Array<{ value: DirectorAnalyticsPeriodPreset; label: string }> = [
	{ value: "today", label: "Сегодня" },
	{ value: "7d", label: "7 дней" },
	{ value: "30d", label: "30 дней" },
	{ value: "90d", label: "90 дней" },
];

type RawMaterialSummaryRow = {
	rawMaterialTypeId: string;
	rawMaterialName: string;
	unit: string;
	intakeQuantity: number;
	consumedQuantity: number;
	balanceQuantity: number;
};

export function DirectorAnalyticsHome() {
	const [periodPreset, setPeriodPreset] = useState<DirectorAnalyticsPeriodPreset>("30d");
	const analytics = useQuery({
		queryKey: ["analytics", "director", periodPreset],
		queryFn: () => getDirectorAnalytics({ periodPreset }),
	});

	return (
		<section className="screen-stack director-home">
				<div className="director-analytics-header">
					<div>
						<h1>Аналитика</h1>
					</div>
				{analytics.isFetching ? (
					<span className="analytics-sync" aria-label="Обновление">
						<RefreshCw aria-hidden size={16} />
					</span>
				) : null}
			</div>

			<div className="analytics-period-control" role="group" aria-label="Период аналитики">
				{PERIOD_OPTIONS.map((option) => (
					<button
						key={option.value}
						type="button"
						className={option.value === periodPreset ? "active" : ""}
						onClick={() => setPeriodPreset(option.value)}
					>
						{option.label}
					</button>
				))}
			</div>

			{analytics.isError ? (
				<div className="analytics-message error">
					<AlertTriangle aria-hidden size={18} />
					<span>Не удалось загрузить аналитику</span>
				</div>
			) : null}

			{analytics.data ? <DirectorAnalyticsView data={analytics.data} /> : null}
			{analytics.isLoading ? <p className="muted">Загрузка аналитики</p> : null}
		</section>
	);
}

function DirectorAnalyticsView({ data }: { data: DirectorAnalyticsResponse }) {
	const rawMaterialRows = useMemo(
		() => buildRawMaterialSummaryRows(data.production),
		[data.production],
	);

	return (
		<>
			<div className="analytics-kpi-grid">
				<MetricBlock
						icon={<WalletCards aria-hidden size={18} />}
						label="Деньги"
						value={formatRubles(data.money.netRevenueCents)}
						detail={`${formatCount(data.money.saleCount, "продажа", "продажи", "продаж")} · отмены ${formatRubles(data.money.cancelledRevenueCents)}`}
					/>
				<MetricBlock
					icon={<Banknote aria-hidden size={18} />}
					label="Текущие наличные"
					value={formatRubles(data.money.currentCash.totalCashCents)}
					detail={`Распределитель ${formatRubles(data.money.currentCash.distributorCashCents)} · курьеры ${formatRubles(data.money.currentCash.courierCashCents)}`}
				/>
				<MetricBlock
					icon={<Factory aria-hidden size={18} />}
						label="Выпуск"
						value={`${formatQuantity(data.production.summary.productReleasedUnits)} шт`}
						detail={`Сырье в продукт: ${formatQuantity(data.production.summary.rawMaterialConsumedQuantity)} ${data.production.summary.rawMaterialConsumedUnit}`}
					/>
				</div>

				<div className="analytics-focus-panel">
					<div className="analytics-section-head">
						<h2>Деньги за период</h2>
						<span>{getPeriodLabel(data.filters.periodPreset)}</span>
					</div>
					<div className="analytics-money-split">
						<div>
							<span>Продажи</span>
							<strong>{formatRubles(data.money.grossRevenueCents)}</strong>
						</div>
						<div>
							<span>Отмены</span>
							<strong>{formatRubles(data.money.cancelledRevenueCents)}</strong>
						</div>
						<div>
							<span>Наличными</span>
							<strong>{formatRubles(data.money.cashRevenueCents)}</strong>
						</div>
						<div>
							<span>Безнал</span>
							<strong>{formatRubles(data.money.cashlessRevenueCents)}</strong>
						</div>
					</div>
				</div>

				<div className="analytics-focus-panel">
					<div className="analytics-section-head">
						<h2>Сырье</h2>
						<span>Приход, расход, остаток</span>
					</div>
					<RawMaterialSummary rows={rawMaterialRows} />
				</div>

				<div className="analytics-focus-panel">
					<div className="analytics-section-head">
						<h2>Продукция</h2>
						<span>Выпуск и движение</span>
					</div>
					<ProductList rows={data.production.productReleased} />
					<div className="analytics-two-columns">
						<AnalyticsValueRow
							label="На распределитель"
							value={`${formatQuantity(data.production.productTransferredToDistributorUnits)} шт`}
						/>
						<AnalyticsValueRow
							label="Остаток в цеху"
							value={`${formatQuantity(data.production.currentWorkshopProductUnits)} шт`}
						/>
					</div>
				</div>
			</>
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

function formatRubles(priceCents: number): string {
	const sign = priceCents < 0 ? "-" : "";
	return `${sign}${formatMoneyCents(moneyCents(Math.abs(priceCents)))} ₽`;
}

function formatQuantity(value: number): string {
	return new Intl.NumberFormat("ru-RU", {
		maximumFractionDigits: 3,
	}).format(value);
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
