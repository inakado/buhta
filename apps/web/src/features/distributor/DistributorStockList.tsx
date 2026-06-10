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
		<table className="inventory-table-list" aria-label="Позиции на распределителе">
			{tableTitle || tableMeta ? (
				<caption className="inventory-table-title">
					<strong>{tableTitle}</strong>
					{tableMeta ? <span>{tableMeta}</span> : null}
				</caption>
			) : null}
			<thead>
				<tr className="inventory-table-head">
					<th className="inventory-table-product" scope="col">Наименование</th>
					<th className="inventory-table-quantity" scope="col">Количество</th>
					<th className="inventory-table-total" scope="col">Итого</th>
				</tr>
			</thead>
			<tbody>
				{groups.map((group) => (
					<Fragment key={group.id}>
						{groupByDistributor && groups.length > 1 ? (
							<tr className="inventory-table-group">
								<th colSpan={3} scope="colgroup">{group.name}</th>
							</tr>
						) : null}
						{group.items.map((item) => (
							<tr className="inventory-table-row" key={item.id}>
								<td className="inventory-table-product">
									<div className="inventory-product-title">
										<strong>{item.productName}</strong>
										{item.discounted ? (
											<BadgePercent aria-hidden className="inventory-discount-icon" size={14} strokeWidth={2.2} />
										) : null}
										{item.discounted ? <span className="sr-only">Цена снижена</span> : null}
									</div>
									{showDistributorName ? <span>{item.distributorName}</span> : null}
								</td>
								<td className="inventory-table-quantity">
									<strong>{item.quantity} шт</strong>
									<span className="inventory-price-line">
										{formatRubles(item.unitPriceCents)}/шт
									</span>
									{item.discounted ? (
										<span className="inventory-price-before">{formatRubles(item.baseUnitPriceCents)}/шт</span>
									) : null}
								</td>
								<td className="inventory-table-total">
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
								</td>
							</tr>
						))}
					</Fragment>
				))}
			</tbody>
		</table>
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
