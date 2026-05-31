"use client";

import { useQuery } from "@tanstack/react-query";
import { PackageCheck, Truck } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
	type CourierProductBalanceItem,
} from "@buhta/shared";
import { getCourierProductBalances } from "../../lib/api-client";

export function CourierBalanceHome({ mode = "own" }: { mode?: "own" | "all" }) {
	const balances = useQuery({
		queryKey: ["courier", "product-balances"],
		queryFn: getCourierProductBalances,
	});
	const data = balances.data;
	const title = mode === "own" ? "Баланс курьера" : "Балансы курьеров";

	return (
		<section className="screen-stack">
			<div className="summary-card">
				<div>
					<p className="summary-label">{title}</p>
					<strong>{balances.isLoading ? "Загрузка" : `${data?.summary.totalUnits ?? 0} шт`}</strong>
					<p className="summary-note">
						Товарный баланс {formatRubles(data?.summary.totalStockValueCents ?? 0)} ₽
					</p>
				</div>
				<Truck aria-hidden size={30} />
			</div>

			<div className="section-heading">
				<h2>Остатки</h2>
				<span>{data?.summary.stockItemCount ?? 0} позиций</span>
			</div>

			{balances.isLoading ? <p className="muted">Загрузка баланса курьера</p> : null}
			{balances.isError ? <p className="form-error">{balances.error.message}</p> : null}
			{!balances.isLoading && !balances.isError && data?.items.length === 0 ? (
				<p className="muted">У курьера пока нет продукции.</p>
			) : null}

			{mode === "all" && data && data.courierSummaries.length > 1 ? (
				<div className="production-stock-stack">
					{data.courierSummaries.map((summary) => (
						<div className="stock-aggregate-card" key={summary.courierUserId}>
							<div className="production-row-icon">
								<Truck aria-hidden size={18} />
							</div>
							<div className="stock-aggregate-body">
								<strong>{summary.courierDisplayName}</strong>
								<p>@{summary.courierLogin} · {summary.stockItemCount} позиций</p>
							</div>
							<div className="stock-aggregate-value">
								<strong>{summary.totalUnits} шт</strong>
								<span>{formatRubles(summary.totalStockValueCents)} ₽</span>
							</div>
						</div>
					))}
				</div>
			) : null}

			<CourierBalanceList items={data?.items ?? []} showCourier={mode === "all"} />
		</section>
	);
}

function CourierBalanceList({
	items,
	showCourier,
}: {
	items: CourierProductBalanceItem[];
	showCourier: boolean;
}) {
	return (
		<div className="list-stack">
			{items.map((item) => (
				<article className="entity-card production-history-card" key={item.id}>
					<div className="inventory-item-main">
						<div className="production-row-icon">
							<PackageCheck aria-hidden size={18} />
						</div>
						<div>
							<strong>{item.productName}</strong>
							<p>{showCourier ? `${item.courierDisplayName} · @${item.courierLogin}` : "У курьера"}</p>
						</div>
					</div>
					<div className="production-history-meta">
						<strong>{item.quantity} шт</strong>
						<span>{formatRubles(item.stockValueCents)} ₽</span>
						<span>{formatRubles(item.unitPriceCents)} ₽/шт</span>
					</div>
				</article>
			))}
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
