"use client";

import { formatMoneyCents, moneyCents, type DistributorInventoryItem } from "@buhta/shared";
import { BadgePercent } from "lucide-react";

export function DistributorStockList({
	items,
	onAssignDiscount,
}: {
	items: DistributorInventoryItem[];
	onAssignDiscount?: (item: DistributorInventoryItem) => void;
}) {
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
						<div className="inventory-product-title">
							<strong>{item.productName}</strong>
							{item.discounted ? (
								<BadgePercent aria-hidden className="inventory-discount-icon" size={14} strokeWidth={2.2} />
							) : null}
							{item.discounted ? <span className="sr-only">Цена снижена</span> : null}
						</div>
						<span>{item.distributorName}</span>
					</div>
					<div className="inventory-table-quantity" role="cell">
						<strong>{item.quantity} шт</strong>
						<span className="inventory-price-line">
							{formatRubles(item.unitPriceCents)}/шт
						</span>
						{item.discounted ? (
							<span className="inventory-price-before">{formatRubles(item.baseUnitPriceCents)}/шт</span>
						) : null}
					</div>
					<div className="inventory-table-total" role="cell">
						<strong>{formatRubles(item.stockValueCents)}</strong>
						{onAssignDiscount ? (
							<button
								className="inventory-inline-action"
								disabled={item.quantity <= 0}
								onClick={() => onAssignDiscount(item)}
								type="button"
							>
								Снизить цену
							</button>
						) : null}
					</div>
				</div>
			))}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return `${formatMoneyCents(moneyCents(priceCents))}\u00A0₽`;
}
