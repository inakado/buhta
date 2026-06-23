import type { CourierProductBalanceItem } from "@buhta/shared";
import { formatCompactRubles } from "../../lib/money-format";
import { formatProductQuantityLabel } from "../operations/product-quantity-input";

export function CourierStockList({
	items,
	showCourier = false,
}: {
	items: CourierProductBalanceItem[];
	showCourier?: boolean;
}) {
	return (
		<table className="inventory-table-list" aria-label="Продукция курьера">
			<thead>
				<tr className="inventory-table-head">
					<th className="inventory-table-product" scope="col">Наименование</th>
					<th className="inventory-table-quantity" scope="col">Количество</th>
					<th className="inventory-table-total" scope="col">Итого</th>
				</tr>
			</thead>
			<tbody>
				{items.map((item) => (
					<tr className="inventory-table-row" key={item.id}>
						<td className="inventory-table-product">
							<strong>{item.productName}</strong>
							<span>{showCourier ? item.courierDisplayName : formatRubles(item.unitPriceCents) + "/шт"}</span>
						</td>
						<td className="inventory-table-quantity">
							<strong>{formatProductQuantityLabel({
								quantity: item.quantity,
								totalNetWeightGrams: item.totalNetWeightGrams,
							})}</strong>
							{showCourier ? <span>{formatRubles(item.unitPriceCents)}/шт</span> : null}
						</td>
						<td className="inventory-table-total">
							<strong>{formatRubles(item.stockValueCents)}</strong>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function formatRubles(priceCents: number): string {
	return formatCompactRubles(priceCents);
}
