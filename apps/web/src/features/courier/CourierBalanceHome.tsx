"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, Truck } from "lucide-react";
import {
	type CourierCashBalanceItem,
	type CourierProductBalanceItem,
	type CourierProductBalancesCourierSummary,
	formatMoneyCents,
	moneyCents,
} from "@buhta/shared";
import { getCourierCashBalances, getCourierProductBalances } from "../../lib/api-client";
import { CourierStockList } from "./CourierStockList";

export function CourierBalanceHome({ mode = "own" }: { mode?: "own" | "all" }) {
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
	const title = mode === "own" ? "Баланс курьера" : "Балансы курьеров";
	const totalUnits = data?.summary.totalUnits ?? 0;
	const totalStockValueCents = data?.summary.totalStockValueCents ?? 0;
	const totalCashCents = cashData?.totalAmountCents ?? 0;
	const stockItemCount = data?.summary.stockItemCount ?? 0;

	return (
		<section className="screen-stack">
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
		</section>
	);
}

function CourierCashPanel({
	items,
}: {
	items: CourierCashBalanceItem[];
}) {
	const ownItem = items[0];

	return (
		<div className="entity-card production-history-card">
			<div className="inventory-item-main">
				<div className="production-row-icon">
					<Banknote aria-hidden size={18} />
				</div>
				<div>
					<strong>Наличные</strong>
					<p>Баланс курьера</p>
				</div>
			</div>
			<div className="production-history-meta">
				<strong>{formatRubles(ownItem?.amountCents ?? 0)} ₽</strong>
				<span>{ownItem?.updatedAt ? "Обновлен" : "Операций нет"}</span>
			</div>
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
					<div className="production-row-icon">
						<Truck aria-hidden size={18} />
					</div>
					<div className="stock-aggregate-body">
						<strong>{summary.courierDisplayName}</strong>
						<p>@{summary.courierLogin} · {summary.stockItemCount} позиций</p>
					</div>
					<div className="courier-balance-values">
						<div>
							<strong>{summary.totalUnits} шт</strong>
							<span>{formatRubles(summary.totalStockValueCents)} ₽ товар</span>
						</div>
						<div>
							<strong>{formatRubles(cashByCourier.get(summary.courierUserId) ?? 0)} ₽</strong>
							<span>наличные</span>
						</div>
					</div>
					<div className="courier-product-stack">
						{(productsByCourier.get(summary.courierUserId) ?? []).map((item) => (
							<div className="courier-product-row" key={item.id}>
								<div>
									<strong>{item.productName}</strong>
									<span>{formatRubles(item.unitPriceCents)} ₽/шт</span>
								</div>
								<div>
									<strong>{item.quantity} шт</strong>
									<span>{formatRubles(item.stockValueCents)} ₽</span>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
