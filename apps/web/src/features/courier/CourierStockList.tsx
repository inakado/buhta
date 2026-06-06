import type { CourierProductBalanceItem } from "@buhta/shared";
import { formatCompactRubles } from "../../lib/money-format";

export function CourierStockList({
	items,
	showCourier = false,
}: {
	items: CourierProductBalanceItem[];
	showCourier?: boolean;
}) {
	return (
		<div className="inventory-table-list" role="table" aria-label="Продукция курьера">
			<div className="inventory-table-head" role="row">
				<span>Продукция</span>
				<span>Количество</span>
				<span>Итого</span>
			</div>
			{items.map((item) => (
				<div className="inventory-table-row" key={item.id} role="row">
					<div className="inventory-table-product" role="cell">
						<strong>{item.productName}</strong>
						<span>{showCourier ? item.courierDisplayName : formatRubles(item.unitPriceCents) + "/шт"}</span>
					</div>
					<div className="inventory-table-quantity" role="cell">
						<strong>{item.quantity} шт</strong>
						{showCourier ? <span>{formatRubles(item.unitPriceCents)}/шт</span> : null}
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
	return formatCompactRubles(priceCents);
}
