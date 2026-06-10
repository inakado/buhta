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
	const balances = useQuery({
		queryKey: ["courier", "product-balances"],
		queryFn: getCourierProductBalances,
	});
	const cashBalances = useQuery({
		queryKey: ["courier", "cash-balances"],
		queryFn: getCourierCashBalances,
	});
	const data = balances.data;
	const cashData = cashBalances.data;
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
					<strong>{balances.isLoading ? "Загрузка" : `${totalUnits} шт`}</strong>
				</div>
				<div>
					<span>Продукция</span>
					<strong>{formatCompactRubles(totalStockValueCents)}</strong>
				</div>
				<div>
					<span>Наличные</span>
					<strong>{cashBalances.isLoading ? "Загрузка" : formatCompactRubles(totalCashCents)}</strong>
				</div>
			</div>

			{balances.isLoading ? <p className="muted">Загрузка остатков курьеров</p> : null}
			{balances.isError ? <p className="form-error">{balances.error.message}</p> : null}
			{cashBalances.isError ? <p className="form-error">Не удалось загрузить наличные курьеров</p> : null}
			{!balances.isLoading && !balances.isError && data?.items.length === 0 ? (
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
						<div className="courier-product-table" role="table" aria-label={`Продукция курьера ${summary.courierDisplayName}`}>
							{variant === "director-stock" ? (
								<div className="sr-only" role="row">
									<span role="columnheader">Наименование</span>
									<span role="columnheader">Количество</span>
									<span role="columnheader">Итого</span>
								</div>
							) : (
								<div className="courier-product-table-head" role="row">
									<span role="columnheader">Наименование</span>
									<span role="columnheader">Количество</span>
									<span role="columnheader">Итого</span>
								</div>
							)}
							{courierProducts.length ? courierProducts.map((item) => (
								<div className="courier-product-row" key={item.id} role="row">
									<div role="cell">
										<strong>{item.productName}</strong>
										{variant === "director-stock" ? null : <span>{formatRubles(item.unitPriceCents)} ₽/шт</span>}
									</div>
									<div role="cell">
										<strong>{item.quantity} шт</strong>
										{variant === "director-stock" ? <span>{formatRubles(item.unitPriceCents)} ₽/шт</span> : null}
									</div>
									<div role="cell">
										<strong>{formatRubles(item.stockValueCents)} ₽</strong>
									</div>
								</div>
							)) : (
								<div className="courier-product-empty" role="row">
									<span role="cell">Нет продукции</span>
								</div>
							)}
						</div>
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
