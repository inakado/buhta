"use client";

import { useQuery } from "@tanstack/react-query";
import {
	type CourierCashBalanceItem,
	type CourierProductBalanceItem,
	type CourierProductBalancesCourierSummary,
} from "@buhta/shared";
import { getCourierCashBalances, getCourierProductBalances } from "../../lib/api-client";
import { formatCompactMoneyCents, formatCompactRubles } from "../../lib/money-format";
import { ProductQuantityDisplay } from "../operations/product-quantity-input";

export function CourierBalanceHome({
	embedded = false,
	hideHeading = false,
	title: titleOverride,
	variant = "default",
}: {
	embedded?: boolean;
	hideHeading?: boolean;
	title?: string;
	variant?: "default" | "director-stock";
}) {
	const {
		data,
		error: balancesErrorValue,
		isError: balancesError,
		isLoading: balancesLoading,
	} = useQuery({
		queryKey: ["courier", "product-balances"],
		queryFn: getCourierProductBalances,
	});
	const {
		data: cashData,
		isError: cashBalancesError,
		isLoading: cashBalancesLoading,
	} = useQuery({
		queryKey: ["courier", "cash-balances"],
		queryFn: getCourierCashBalances,
	});
	const title = titleOverride ?? "Балансы курьеров";
	const totalUnits = data?.summary.totalUnits ?? 0;
	const totalNetWeightGrams = data?.summary.totalNetWeightGrams ?? 0;
	const totalStockValueCents = data?.summary.totalStockValueCents ?? 0;
	const totalCashCents = cashData?.totalAmountCents ?? 0;
	const courierCount = data?.summary.courierCount ?? 0;
	const Frame = embedded ? "div" : "section";
	const frameClassName = [
		embedded ? "embedded-screen-stack" : "screen-stack",
		"courier-ledger-surface",
		variant === "director-stock" ? "courier-ledger-surface--director" : "",
	].filter(Boolean).join(" ");

	return (
		<Frame className={frameClassName}>
			{hideHeading ? null : (
				<div className="section-heading">
					<h2>{title}</h2>
					<span>{formatCourierCount(courierCount)}</span>
				</div>
			)}

			<div className="inventory-overview-strip">
				<div>
					<span>Количество</span>
					{balancesLoading ? <strong>Загрузка</strong> : (
						<ProductQuantityDisplay
							quantity={totalUnits}
							totalNetWeightGrams={totalNetWeightGrams}
							variant="summary-inline"
						/>
					)}
				</div>
				<div>
					<span>Продукция</span>
					<strong>{formatCompactRubles(totalStockValueCents)}</strong>
				</div>
				<div>
					<span>Наличные</span>
					<strong>{cashBalancesLoading ? "Загрузка" : formatCompactRubles(totalCashCents)}</strong>
				</div>
			</div>

			{balancesLoading ? <p className="muted">Загрузка остатков курьеров</p> : null}
			{balancesError ? <p className="form-error">{balancesErrorValue.message}</p> : null}
			{cashBalancesError ? <p className="form-error">Не удалось загрузить наличные курьеров</p> : null}
			{!balancesLoading && !balancesError && data?.items.length === 0 ? (
				<p className="muted">У курьеров пока нет продукции.</p>
			) : null}

			<CourierPeopleList
				cashItems={cashData?.items ?? []}
				productItems={data?.items ?? []}
				summaries={data?.courierSummaries ?? []}
			/>
		</Frame>
	);
}

function CourierPeopleList({
	cashItems,
	productItems,
	summaries,
}: {
	cashItems: CourierCashBalanceItem[];
	productItems: CourierProductBalanceItem[];
	summaries: CourierProductBalancesCourierSummary[];
}) {
	if (summaries.length === 0) {
		return null;
	}
	const cashByCourier = new Map(cashItems.map((item) => [item.courierUserId, item.amountCents]));
	const productsByCourier = new Map<string, CourierProductBalanceItem[]>();
	for (const item of productItems) {
		const courierItems = productsByCourier.get(item.courierUserId) ?? [];
		courierItems.push(item);
		productsByCourier.set(item.courierUserId, courierItems);
	}

	return (
		<div className="courier-balance-list">
			{summaries.map((summary, index) => {
				const courierProducts = productsByCourier.get(summary.courierUserId) ?? [];
				const courierCashCents = cashByCourier.get(summary.courierUserId) ?? 0;
				const hasProducts = courierProducts.length > 0;

				return (
					<details
						className={hasProducts ? "courier-balance-card" : "courier-balance-card courier-balance-card--empty"}
						key={summary.courierUserId}
						open={index === 0 && hasProducts}
					>
						<summary className="courier-balance-summary">
							<div className="courier-balance-identity">
								<strong>{summary.courierDisplayName}</strong>
								<span className={hasProducts ? "courier-balance-status" : "courier-balance-status courier-balance-status--empty"}>
									{hasProducts ? formatPositionCount(summary.stockItemCount) : "нет товара"}
								</span>
								{hasProducts ? (
									<span className="courier-balance-quantity">
										<ProductQuantityDisplay
											quantity={summary.totalUnits}
											totalNetWeightGrams={summary.totalNetWeightGrams}
											variant="summary-inline"
										/>
									</span>
								) : null}
							</div>
							<div className="courier-balance-amounts">
								<div>
									<strong>{formatRubles(summary.totalStockValueCents)} ₽</strong>
									<span>товар</span>
								</div>
								<div>
									<strong>{formatRubles(courierCashCents)} ₽</strong>
									<span>наличные</span>
								</div>
							</div>
							{hasProducts ? <span className="courier-balance-disclosure" aria-hidden="true" /> : null}
						</summary>
						{hasProducts ? (
							<table className="courier-balance-products" aria-label={`Продукция курьера ${summary.courierDisplayName}`}>
								<thead className="sr-only">
									<tr>
										<th scope="col">Наименование</th>
										<th scope="col">Количество</th>
										<th scope="col">Итого</th>
									</tr>
								</thead>
								<tbody>
									{courierProducts.map((item) => (
										<tr className="courier-balance-product-row" key={item.id}>
											<td>
												<strong>{item.productName}</strong>
												{item.discounted ? (
													<span className="courier-balance-price">
														<span>{formatRubles(item.unitPriceCents)} ₽/шт</span>
														<span className="courier-balance-price-before">{formatRubles(item.baseUnitPriceCents)} ₽/шт</span>
													</span>
												) : null}
											</td>
											<td>
												<ProductQuantityDisplay
													quantity={item.quantity}
													totalNetWeightGrams={item.totalNetWeightGrams}
													variant="table"
												/>
											</td>
											<td>
												<strong>{formatRubles(item.stockValueCents)} ₽</strong>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : null}
					</details>
				);
			})}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatCompactMoneyCents(priceCents);
}

function formatPositionCount(count: number): string {
	return `${count} ${formatRussianPlural(count, "позиция", "позиции", "позиций")}`;
}

function formatCourierCount(count: number): string {
	return `${count} ${formatRussianPlural(count, "курьер", "курьера", "курьеров")}`;
}

function formatRussianPlural(count: number, one: string, few: string, many: string): string {
	const absolute = Math.abs(count);
	const lastTwo = absolute % 100;
	const last = absolute % 10;

	if (lastTwo >= 11 && lastTwo <= 14) {
		return many;
	}
	if (last === 1) {
		return one;
	}
	if (last >= 2 && last <= 4) {
		return few;
	}

	return many;
}
