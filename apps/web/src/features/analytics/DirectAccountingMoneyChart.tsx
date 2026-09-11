"use client";

import { useState, type CSSProperties } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartPoint = {
	label: string;
	revenueCents: number;
	expensesCents: number;
	transfersCents: number;
};

type MoneySeriesKey = "revenueCents" | "expensesCents" | "transfersCents";

const MONEY_SERIES: Array<{ color: string; key: MoneySeriesKey; label: string }> = [
	{ color: "#4ab855", key: "revenueCents", label: "Выручка" },
	{ color: "#b24a3b", key: "expensesCents", label: "Затраты" },
	{ color: "#3f4743", key: "transfersCents", label: "Передача" },
];

export default function DirectAccountingMoneyChart({
	data,
	formatAxisMoney,
	formatMoney,
}: {
	data: ChartPoint[];
	formatAxisMoney: (value: number) => string;
	formatMoney: (value: number) => string;
}) {
	const [visibleSeries, setVisibleSeries] = useState<Record<MoneySeriesKey, boolean>>({
		revenueCents: true,
		expensesCents: false,
		transfersCents: false,
	});
	const activeSeries = MONEY_SERIES.filter((series) => visibleSeries[series.key]);
	const hasActivity = data.some((point) => activeSeries.some((series) => point[series.key] !== 0));
	const baseBarSize = data.length <= 7 ? 28 : data.length <= 14 ? 20 : 16;
	const barSize = activeSeries.length === 1
		? baseBarSize
		: activeSeries.length === 2
			? Math.max(8, Math.round(baseBarSize * 0.55))
			: Math.max(6, Math.round(baseBarSize * 0.38));

	return (
		<section className="direct-accounting-chart-panel" aria-labelledby="direct-accounting-chart-title">
			<div className="direct-accounting-panel-heading">
				<h2 id="direct-accounting-chart-title">Денежные операции</h2>
			</div>
			<div className="direct-accounting-chart-series" aria-label="Показатели графика">
				{MONEY_SERIES.map((series) => (
					<label
						key={series.key}
						style={{ "--chart-series-color": series.color } as CSSProperties}
					>
						<input
							checked={visibleSeries[series.key]}
							onChange={(event) => setVisibleSeries((current) => ({
								...current,
								[series.key]: event.target.checked,
							}))}
							type="checkbox"
						/>
						{series.label}
					</label>
				))}
			</div>
			{activeSeries.length === 0 ? (
				<p className="director-dashboard-empty">Выберите показатели для графика</p>
			) : hasActivity ? (
				<div className="direct-accounting-chart">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							barCategoryGap="22%"
							barGap={2}
							data={data}
							margin={{ top: 18, right: 12, bottom: 2, left: 4 }}
						>
							<CartesianGrid stroke="#e3e8e2" />
							<XAxis
								axisLine={false}
								dataKey="label"
								interval="preserveStartEnd"
								minTickGap={24}
								tick={{ fill: "#66706a", fontSize: 11 }}
								tickLine={false}
							/>
							<YAxis
								axisLine={false}
								domain={[0, "auto"]}
								tick={{ fill: "#66706a", fontSize: 11 }}
								tickFormatter={formatAxisMoney}
								tickLine={false}
								width={58}
							/>
							<Tooltip
								contentStyle={{
									background: "#ffffff",
									border: "1px solid #d8dfd7",
									borderRadius: 10,
									boxShadow: "0 8px 22px rgb(0 0 0 / 12%)",
									fontSize: 12,
								}}
								cursor={{ fill: "#f2f4f1" }}
								formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
								labelStyle={{ color: "#000000", fontWeight: 600, marginBottom: 6 }}
							/>
							{activeSeries.map((series) => (
								<Bar
									barSize={barSize}
									dataKey={series.key}
									fill={series.color}
									key={series.key}
									name={series.label}
									radius={[3, 3, 0, 0]}
								/>
							))}
						</BarChart>
					</ResponsiveContainer>
				</div>
			) : <p className="director-dashboard-empty">За период нет выбранных денежных операций</p>}
		</section>
	);
}
