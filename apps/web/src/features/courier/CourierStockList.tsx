"use client";

import { PackageCheck } from "lucide-react";
import { formatMoneyCents, moneyCents, type CourierProductBalanceItem } from "@buhta/shared";

export function CourierStockList({
	items,
	showCourier = false,
}: {
	items: CourierProductBalanceItem[];
	showCourier?: boolean;
}) {
	return (
		<div className="list-stack">
			{items.map((item) => (
				<article className="entity-card production-history-card" key={item.id}>
					<div className="inventory-item-main">
						<div className="production-row-icon">
							<PackageCheck aria-hidden size={18} />
						</div>
						<div>
							<strong>{item.productName}</strong>
							<p>{showCourier ? `${item.courierDisplayName} · @${item.courierLogin}` : "У курьера"}</p>
						</div>
					</div>
					<div className="production-history-meta">
						<strong>{item.quantity} шт</strong>
						<span>{formatRubles(item.stockValueCents)} ₽</span>
						<span>{formatRubles(item.unitPriceCents)} ₽/шт</span>
					</div>
				</article>
			))}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
