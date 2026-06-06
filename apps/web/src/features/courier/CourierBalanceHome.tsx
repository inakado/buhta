"use client";

import { useQuery } from "@tanstack/react-query";
import {
	type CourierCashBalanceItem,
	type CourierProductBalanceItem,
	type CourierProductBalancesCourierSummary,
	formatMoneyCents,
	moneyCents,
} from "@buhta/shared";
import { getCourierCashBalances, getCourierProductBalances } from "../../lib/api-client";
import { CourierStockList } from "./CourierStockList";

export function CourierBalanceHome({
	embedded = false,
	mode = "own",
	title: titleOverride,
}: {
	embedded?: boolean;
	mode?: "own" | "all";
	title?: string;
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
	const title = titleOverride ?? (mode === "own" ? "Баланс курьера" : "Балансы курьеров");
	const totalUnits = data?.summary.totalUnits ?? 0;
	const totalStockValueCents = data?.summary.totalStockValueCents ?? 0;
	const totalCashCents = cashData?.totalAmountCents ?? 0;
	const stockItemCount = data?.summary.stockItemCount ?? 0;
	const Frame = embedded ? "div" : "section";

	return (
		<Frame className={embedded ? "embedded-screen-stack" : "screen-stack"}>
			<div className="section-heading">
				<h2>{title}</h2>
				<span>{stockItemCount} позиций</span>
			</div>

			<div className="inventory-overview-strip">
				<div>
					<span>Товар</span>
					<strong>{balances.isLoading ? "Загрузка" : `${totalUnits} шт`}</strong>
				</div>
				<div>
					<span>Стоимость</span>
					<strong>{formatRubles(totalStockValueCents)} ₽</strong>
				</div>
				<div>
					<span>Наличные</span>
					<strong>{cashBalances.isLoading ? "Загрузка" : `${formatRubles(totalCashCents)} ₽`}</strong>
				</div>
			</div>

			{balances.isLoading ? <p className="muted">Загрузка баланса курьера</p> : null}
			{balances.isError ? <p className="form-error">{balances.error.message}</p> : null}
			{cashBalances.isError ? <p className="form-error">Не удалось загрузить cash-балансы</p> : null}
			{!balances.isLoading && !balances.isError && data?.items.length === 0 ? (
				<p className="muted">У курьера пока нет продукции.</p>
			) : null}

			{mode === "own" ? <CourierCashPanel items={cashData?.items ?? []} /> : null}

			<CourierPeopleList
				cashItems={cashData?.items ?? []}
				productItems={data?.items ?? []}
				summaries={data?.courierSummaries ?? []}
				mode={mode}
			/>

			{mode === "own" ? (
				<>
					<div className="section-heading">
						<h2>Остатки</h2>
						<span>{stockItemCount} позиций</span>
					</div>
					<CourierStockList items={data?.items ?? []} />
				</>
			) : null}
		</Frame>
	);
}

function CourierCashPanel({
	items,
}: {
	items: CourierCashBalanceItem[];
}) {
	const ownItem = items[0];

	return (
		<div className="flat-balance-row">
			<div>
				<strong>Наличные</strong>
				<p>{ownItem?.updatedAt ? "Обновлен" : "Операций нет"}</p>
			</div>
			<strong>{formatRubles(ownItem?.amountCents ?? 0)} ₽</strong>
		</div>
	);
}

function CourierPeopleList({
	cashItems,
	productItems,
	summaries,
	mode,
}: {
	cashItems: CourierCashBalanceItem[];
	productItems: CourierProductBalanceItem[];
	summaries: CourierProductBalancesCourierSummary[];
	mode: "own" | "all";
}) {
	if (mode !== "all" || summaries.length === 0) {
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
		<div className="production-stock-stack">
			<div className="section-heading compact">
				<h2>Курьеры</h2>
				<span>{summaries.length}</span>
			</div>
			{summaries.map((summary) => (
				<div className="courier-balance-card" key={summary.courierUserId}>
					<div className="courier-balance-head">
						<div>
							<strong>{summary.courierDisplayName}</strong>
							<p>{summary.stockItemCount} позиций</p>
						</div>
						<div className="courier-cash-value">
							<strong>{formatRubles(cashByCourier.get(summary.courierUserId) ?? 0)} ₽</strong>
							<span>наличные</span>
						</div>
					</div>
					<div className="courier-product-table">
						<div className="courier-product-table-head">
							<span>Товар</span>
							<span>Количество</span>
							<span>Сумма</span>
						</div>
						{(productsByCourier.get(summary.courierUserId) ?? []).map((item) => (
							<div className="courier-product-row" key={item.id}>
								<div>
									<strong>{item.productName}</strong>
									<span>{formatRubles(item.unitPriceCents)} ₽/шт</span>
								</div>
								<div>
									<strong>{item.quantity} шт</strong>
								</div>
								<div>
									<strong>{formatRubles(item.stockValueCents)} ₽</strong>
								</div>
							</div>
						))}
					</div>
					<div className="courier-product-total">
						<span>Итого товаром</span>
						<strong>{formatRubles(summary.totalStockValueCents)} ₽</strong>
					</div>
				</div>
			))}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
