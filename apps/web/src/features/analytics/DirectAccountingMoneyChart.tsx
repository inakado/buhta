"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartPoint = {
	label: string;
	revenueCents: number;
};

export default function DirectAccountingMoneyChart({
	data,
	formatAxisMoney,
	formatMoney,
}: {
	data: ChartPoint[];
	formatAxisMoney: (value: number) => string;
	formatMoney: (value: number) => string;
}) {
	const hasActivity = data.some((point) => point.revenueCents !== 0);

	return (
		<section className="direct-accounting-chart-panel" aria-labelledby="direct-accounting-chart-title">
			<div className="direct-accounting-panel-heading">
				<h2 id="direct-accounting-chart-title">Выручка по дням</h2>
			</div>
			{hasActivity ? (
				<div className="direct-accounting-chart">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 18, right: 12, bottom: 2, left: 4 }}>
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
								domain={["auto", "auto"]}
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
								formatter={(value) => [formatMoney(Number(value)), "Выручка"]}
								labelStyle={{ color: "#000000", fontWeight: 600, marginBottom: 6 }}
							/>
							<Bar dataKey="revenueCents" fill="#4ab855" maxBarSize={22} radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			) : <p className="director-dashboard-empty">За период нет денежных операций</p>}
			{hasActivity ? (
				<div className="direct-accounting-chart-legend" aria-hidden>
					<span><i className="revenue" />Выручка за день</span>
				</div>
			) : null}
		</section>
	);
}
