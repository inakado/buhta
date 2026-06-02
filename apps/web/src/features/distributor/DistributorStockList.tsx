"use client";

import { formatMoneyCents, moneyCents, type DistributorInventoryItem } from "@buhta/shared";

export function DistributorStockList({ items }: { items: DistributorInventoryItem[] }) {
	return (
		<div className="inventory-table-list" role="table" aria-label="Позиции на распределителе">
			<div className="inventory-table-head" role="row">
				<span>Позиция</span>
				<span>Количество</span>
				<span>Сумма</span>
			</div>
			{items.map((item) => (
				<div className="inventory-table-row" key={item.id} role="row">
					<div className="inventory-table-product" role="cell">
						<strong>{item.productName}</strong>
						<span>{item.distributorName}</span>
					</div>
					<div className="inventory-table-quantity" role="cell">
						<strong>{item.quantity} шт</strong>
						<span>{formatRubles(item.priceCents)}/шт</span>
					</div>
					<div className="inventory-table-total" role="cell">
						<strong>{formatRubles(item.stockValueCents)}</strong>
					</div>
				</div>
			))}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return `${formatMoneyCents(moneyCents(priceCents))}\u00A0₽`;
}
