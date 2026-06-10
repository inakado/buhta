"use client";

import { useState } from "react";
import { CourierBalanceHome } from "../../features/courier/CourierBalanceHome";
import { DistributorInventoryHome } from "../../features/distributor/DistributorInventoryHome";
import type { CurrentActor } from "../../lib/api-client";
import { SegmentedControl } from "../../ui/SegmentedControl";

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
			<div className="director-stock-topbar">
				<div className="director-dashboard-header">
					<h1>Остатки</h1>
				</div>

				{availableViews.length > 1 ? (
					<SegmentedControl
						ariaLabel="Контур остатков"
						className="director-stock-tabs"
						items={availableViews}
						onChange={setSelectedView}
						value={activeView}
					/>
				) : null}
			</div>

			<div className="director-stock-body">
				{activeView === "distributor" ? (
					<DistributorInventoryHome
						canAssignDiscount={actor.permissions.includes("discount.assign")}
						canWithdrawCash={actor.permissions.includes("cash.withdraw")}
						discountActionLabel="Снизить"
						embedded
						hideHeading
						online={online}
						showCashBalance={actor.permissions.includes("distributor.cash.read")}
					/>
				) : (
					<CourierBalanceHome embedded hideHeading variant="director-stock" />
				)}
			</div>
		</section>
	);
}
