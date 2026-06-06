"use client";

import { useState } from "react";
import { CourierBalanceHome } from "../../features/courier/CourierBalanceHome";
import { DistributorInventoryHome } from "../../features/distributor/DistributorInventoryHome";
import type { CurrentActor } from "../../lib/api-client";

const STOCK_VIEWS = [
	{ value: "distributor", label: "Распределитель" },
	{ value: "couriers", label: "Курьеры" },
] as const;

type StockView = typeof STOCK_VIEWS[number]["value"];

export function DirectorStockHome({
	actor,
	online,
}: {
	actor: CurrentActor;
	online: boolean;
}) {
	const availableViews = STOCK_VIEWS.filter((view) => {
		if (view.value === "distributor") {
			return actor.permissions.includes("distributor.stock.read");
		}

		return actor.permissions.includes("courier.stock.read");
	});
	const [selectedView, setSelectedView] = useState<StockView>(availableViews[0]?.value ?? "distributor");
	const activeView = availableViews.some((view) => view.value === selectedView)
		? selectedView
		: availableViews[0]?.value;

	if (!activeView) {
		return (
			<section className="screen-stack">
				<div className="placeholder-panel">
					<div>
						<h2>Остатки</h2>
						<p>Раздел недоступен для текущей роли.</p>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="screen-stack director-stock-home">
			<div className="section-heading">
				<h2>Остатки</h2>
				<span>{activeView === "distributor" ? "Распределитель" : "Курьеры"}</span>
			</div>

			{availableViews.length > 1 ? (
				<div
					className="analytics-view-tabs director-stock-tabs"
					role="tablist"
					aria-label="Контур остатков"
					style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
				>
					{availableViews.map((view) => (
						<button
							key={view.value}
							type="button"
							role="tab"
							aria-selected={view.value === activeView}
							className={view.value === activeView ? "active" : ""}
							onClick={() => setSelectedView(view.value)}
						>
							{view.label}
						</button>
					))}
				</div>
			) : null}

			{activeView === "distributor" ? (
				<DistributorInventoryHome
					canAssignDiscount={actor.permissions.includes("discount.assign")}
					canWithdrawCash={actor.permissions.includes("cash.withdraw")}
					embedded
					online={online}
					showCashBalance={actor.permissions.includes("distributor.cash.read")}
					title="Распределитель"
				/>
			) : (
				<CourierBalanceHome embedded mode="all" title="Курьеры" />
			)}
		</section>
	);
}
