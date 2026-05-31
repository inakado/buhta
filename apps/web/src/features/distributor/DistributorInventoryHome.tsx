"use client";

import { useQuery } from "@tanstack/react-query";
import { Box } from "lucide-react";
import { formatMoneyCents, moneyCents, type DistributorCashBalanceItem } from "@buhta/shared";
import { getDistributorCashBalances, getDistributorInventory } from "../../lib/api-client";
import { DistributorStockList } from "./DistributorStockList";

export function DistributorInventoryHome({ showCashBalance = false }: { showCashBalance?: boolean }) {
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

	return (
		<section className="screen-stack">
			<div className="summary-card">
				<div>
					<p className="summary-label">Товар на распределителе</p>
					<strong>{inventory.isLoading ? "Загрузка" : `${data?.summary.totalUnits ?? 0} шт`}</strong>
					<p className="summary-note">
						Товарный баланс {formatRubles(data?.summary.totalStockValueCents ?? 0)} ₽
					</p>
				</div>
				<Box aria-hidden size={30} />
			</div>

			{showCashBalance ? (
				<DistributorCashSummary
					isError={cashBalances.isError}
					isLoading={cashBalances.isLoading}
					items={cashData?.items ?? []}
					totalAmountCents={cashData?.totalAmountCents ?? 0}
				/>
			) : null}

			<div className="section-heading">
				<h2>Остатки</h2>
				<span>{data?.summary.stockItemCount ?? 0} позиций</span>
			</div>

			{inventory.isLoading ? <p className="muted">Загрузка остатков распределителя</p> : null}
			{inventory.isError ? <p className="form-error">{inventory.error.message}</p> : null}
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
								<span>{formatRubles(summary.totalStockValueCents)} ₽</span>
							</div>
						</div>
					))}
				</div>
			) : null}

			<DistributorStockList items={data?.items ?? []} />
		</section>
	);
}

function DistributorCashSummary({
	isError,
	isLoading,
	items,
	totalAmountCents,
}: {
	isError: boolean;
	isLoading: boolean;
	items: DistributorCashBalanceItem[];
	totalAmountCents: number;
}) {
	return (
		<div className="summary-card compact-summary">
			<div>
				<p className="summary-label">Наличные на распределителе</p>
				<strong>{isLoading ? "Загрузка" : `${formatRubles(totalAmountCents)} ₽`}</strong>
				<p className="summary-note">
					{items.length > 1 ? `${items.length} распределителя` : "Денежный баланс"}
				</p>
				{isError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}
			</div>
			<Box aria-hidden size={28} />
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
