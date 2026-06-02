"use client";

import { useQuery } from "@tanstack/react-query";
import { Box } from "lucide-react";
import { formatMoneyCents, moneyCents } from "@buhta/shared";
import { getDistributorCashBalances, getDistributorInventory } from "../../lib/api-client";
import { DistributorStockList } from "./DistributorStockList";

export function DistributorInventoryHome({
	showCashBalance = false,
	title = "Остатки",
}: {
	showCashBalance?: boolean;
	title?: string;
}) {
	const inventory = useQuery({
		queryKey: ["distributor", "inventory"],
		queryFn: getDistributorInventory,
	});
	const cashBalances = useQuery({
		queryKey: ["distributor", "cash-balances"],
		queryFn: getDistributorCashBalances,
		enabled: showCashBalance,
	});
	const data = inventory.data;
	const cashData = cashBalances.data;
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
					<strong>{inventory.isLoading ? "Загрузка" : `${totalUnits} шт`}</strong>
				</div>
				<div>
					<span>Стоимость</span>
					<MoneyValue valueCents={totalStockValueCents} />
				</div>
				{showCashBalance ? (
					<div>
						<span>Наличные</span>
						{cashBalances.isLoading ? <strong>Загрузка</strong> : <MoneyValue valueCents={totalCashCents} />}
					</div>
				) : null}
			</div>

			{inventory.isLoading ? <p className="muted">Загрузка остатков распределителя</p> : null}
			{inventory.isError ? <p className="form-error">{inventory.error.message}</p> : null}
			{cashBalances.isError ? <p className="form-error">Не удалось загрузить наличные распределителя</p> : null}
			{!inventory.isLoading && !inventory.isError && data?.items.length === 0 ? (
				<p className="muted">На распределителе пока нет продукции.</p>
			) : null}

			{data && data.distributorSummaries.length > 1 ? (
				<div className="production-stock-stack">
					{data.distributorSummaries.map((summary) => (
						<div className="stock-aggregate-card" key={summary.distributorId}>
							<div className="production-row-icon">
								<Box aria-hidden size={18} />
							</div>
							<div className="stock-aggregate-body">
								<strong>{summary.distributorName}</strong>
								<p>{summary.stockItemCount} позиций</p>
							</div>
							<div className="stock-aggregate-value">
								<strong>{summary.totalUnits} шт</strong>
								<span>{formatRubles(summary.totalStockValueCents)}</span>
							</div>
						</div>
					))}
				</div>
			) : null}

			<DistributorStockList items={data?.items ?? []} />
		</section>
	);
}

function MoneyValue({ valueCents }: { valueCents: number }) {
	return (
		<strong style={moneyValueStyle}>
			<span>{formatMoneyCents(moneyCents(valueCents))}</span>
			<span>₽</span>
		</strong>
	);
}

const moneyValueStyle = {
	display: "inline-flex",
	gap: 4,
	lineHeight: 1,
	whiteSpace: "nowrap",
	wordBreak: "keep-all",
} as const;

function formatRubles(priceCents: number): string {
	return `${formatMoneyCents(moneyCents(priceCents))}\u00A0₽`;
}
