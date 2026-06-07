"use client";

import type { DistributorInventoryItem } from "@buhta/shared";
import { BadgePercent } from "lucide-react";
import { Fragment } from "react";
import { formatCompactRubles } from "../../lib/money-format";

export function DistributorStockList({
	discountActionLabel = "Снизить цену",
	groupByDistributor = false,
	items,
	onAssignDiscount,
	showDistributorName = true,
	tableMeta,
	tableTitle,
}: {
	discountActionLabel?: string;
	groupByDistributor?: boolean;
	items: DistributorInventoryItem[];
	onAssignDiscount?: (item: DistributorInventoryItem) => void;
	showDistributorName?: boolean;
	tableMeta?: string;
	tableTitle?: string;
}) {
	const groups = groupByDistributor ? groupItemsByDistributor(items) : [{ id: "all", name: "", items }];

	return (
		<div className="inventory-table-list" role="table" aria-label="Позиции на распределителе">
			{tableTitle || tableMeta ? (
				<div className="inventory-table-title" role="row">
					<strong>{tableTitle}</strong>
					{tableMeta ? <span>{tableMeta}</span> : null}
				</div>
			) : null}
			<div className="inventory-table-head" role="row">
				<span>Продукция</span>
				<span>Количество</span>
				<span>Итого</span>
			</div>
			{groups.map((group) => (
				<Fragment key={group.id}>
					{groupByDistributor && groups.length > 1 ? (
						<div className="inventory-table-group" role="row">
							<span>{group.name}</span>
						</div>
					) : null}
					{group.items.map((item) => (
						<div className="inventory-table-row" key={item.id} role="row">
							<div className="inventory-table-product" role="cell">
								<div className="inventory-product-title">
									<strong>{item.productName}</strong>
									{item.discounted ? (
										<BadgePercent aria-hidden className="inventory-discount-icon" size={14} strokeWidth={2.2} />
									) : null}
									{item.discounted ? <span className="sr-only">Цена снижена</span> : null}
								</div>
								{showDistributorName ? <span>{item.distributorName}</span> : null}
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
										aria-label="Снизить цену"
										className="inventory-inline-action"
										disabled={item.quantity <= 0}
										onClick={() => onAssignDiscount(item)}
										type="button"
									>
										{discountActionLabel}
									</button>
								) : null}
							</div>
						</div>
					))}
				</Fragment>
			))}
		</div>
	);
}

function groupItemsByDistributor(items: DistributorInventoryItem[]): Array<{
	id: string;
	name: string;
	items: DistributorInventoryItem[];
}> {
	const groups = new Map<string, { id: string; name: string; items: DistributorInventoryItem[] }>();

	for (const item of items) {
		const existing = groups.get(item.distributorId);
		if (existing) {
			existing.items.push(item);
			continue;
		}
		groups.set(item.distributorId, {
			id: item.distributorId,
			items: [item],
			name: item.distributorName,
		});
	}

	return [...groups.values()];
}

function formatRubles(priceCents: number): string {
	return formatCompactRubles(priceCents);
}
