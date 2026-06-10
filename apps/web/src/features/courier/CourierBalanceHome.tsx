"use client";

import { useQuery } from "@tanstack/react-query";
import {
	type CourierCashBalanceItem,
	type CourierProductBalanceItem,
	type CourierProductBalancesCourierSummary,
} from "@buhta/shared";
import { getCourierCashBalances, getCourierProductBalances } from "../../lib/api-client";
import { formatCompactMoneyCents, formatCompactRubles } from "../../lib/money-format";

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
	const totalStockValueCents = data?.summary.totalStockValueCents ?? 0;
	const totalCashCents = cashData?.totalAmountCents ?? 0;
	const stockItemCount = data?.summary.stockItemCount ?? 0;
	const Frame = embedded ? "div" : "section";
	const frameClassName = [
		embedded ? "embedded-screen-stack" : "screen-stack",
		variant === "director-stock" ? "courier-ledger-surface" : "",
	].filter(Boolean).join(" ");

	return (
		<Frame className={frameClassName}>
			{hideHeading ? null : (
				<div className="section-heading">
					<h2>{title}</h2>
					<span>{stockItemCount} позиций</span>
				</div>
			)}

			<div className="inventory-overview-strip">
				<div>
					<span>Количество</span>
					<strong>{balancesLoading ? "Загрузка" : `${totalUnits} шт`}</strong>
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
				variant={variant}
			/>
		</Frame>
	);
}

function CourierPeopleList({
	cashItems,
	productItems,
	summaries,
	variant,
}: {
	cashItems: CourierCashBalanceItem[];
	productItems: CourierProductBalanceItem[];
	summaries: CourierProductBalancesCourierSummary[];
	variant: "default" | "director-stock";
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
			{variant === "director-stock" ? (
				<div className="director-courier-table-head">
					<span>Курьер</span>
					<span>Остаток</span>
					<span>Наличные</span>
				</div>
			) : null}
			{summaries.map((summary) => {
				const courierProducts = productsByCourier.get(summary.courierUserId) ?? [];
				const courierCashCents = cashByCourier.get(summary.courierUserId) ?? 0;

				return (
					<div className="courier-balance-card" key={summary.courierUserId}>
						<div className="courier-balance-head">
							<div>
								<strong>{summary.courierDisplayName}</strong>
								<p>{summary.stockItemCount} позиций</p>
							</div>
							{variant === "director-stock" ? (
								<div className="courier-balance-metrics">
									<strong>{formatRubles(summary.totalStockValueCents)} ₽</strong>
									<strong>{formatRubles(courierCashCents)} ₽</strong>
								</div>
							) : (
								<div className="courier-cash-value">
									<strong>{formatRubles(courierCashCents)} ₽</strong>
									<span>наличные</span>
								</div>
							)}
						</div>
						<table className="courier-product-table" aria-label={`Продукция курьера ${summary.courierDisplayName}`}>
							<thead className={variant === "director-stock" ? "sr-only" : undefined}>
								<tr className="courier-product-table-head">
									<th scope="col">Наименование</th>
									<th scope="col">Количество</th>
									<th scope="col">Итого</th>
								</tr>
							</thead>
							<tbody>
								{courierProducts.length ? courierProducts.map((item) => (
									<tr className="courier-product-row" key={item.id}>
										<td>
											<strong>{item.productName}</strong>
											{variant === "director-stock" ? null : <span>{formatRubles(item.unitPriceCents)} ₽/шт</span>}
										</td>
										<td>
											<strong>{item.quantity} шт</strong>
											{variant === "director-stock" ? <span>{formatRubles(item.unitPriceCents)} ₽/шт</span> : null}
										</td>
										<td>
											<strong>{formatRubles(item.stockValueCents)} ₽</strong>
										</td>
									</tr>
								)) : (
									<tr className="courier-product-empty">
										<td colSpan={3}>Нет продукции</td>
									</tr>
								)}
							</tbody>
						</table>
						{variant === "director-stock" ? null : (
							<div className="courier-product-total">
								<span>Всего продукции</span>
								<strong>{formatRubles(summary.totalStockValueCents)} ₽</strong>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatCompactMoneyCents(priceCents);
}
