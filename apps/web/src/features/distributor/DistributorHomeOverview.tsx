"use client";

import { useQuery } from "@tanstack/react-query";
import { PackageCheck, ReceiptText } from "lucide-react";
import { formatMoneyCents, moneyCents } from "@buhta/shared";
import { getDistributorCashBalances, getDistributorInventory } from "../../lib/api-client";
import { DistributorStockList } from "./DistributorStockList";

type DistributorHomeOverviewProps = {
	onSale: () => void;
	saleDisabled?: boolean;
	showCashBalance?: boolean;
	showStockList?: boolean;
	summaryLayout?: "default" | "commercial";
	stockSummaryLabel: string;
	title: string;
};

export function DistributorHomeOverview({
	onSale,
	saleDisabled = false,
	showCashBalance = false,
	showStockList = true,
	summaryLayout = "default",
	stockSummaryLabel,
	title,
}: DistributorHomeOverviewProps) {
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
	const isFetching = inventory.isFetching || (showCashBalance && cashBalances.isFetching);
	const stockUnits = data?.summary.totalUnits ?? 0;
	const stockValueCents = data?.summary.totalStockValueCents ?? 0;
	const stockItemCount = data?.summary.stockItemCount ?? 0;
	const cashAmountCents = cashBalances.data?.totalAmountCents ?? 0;

	return (
		<section className="screen-stack">
			<div className="section-heading compact">
				<h2>{title}</h2>
				{isFetching ? <span>Обновление</span> : null}
			</div>

			{summaryLayout === "commercial" ? (
				<div className="commercial-overview-card">
					<div className="commercial-overview-main">
						<div>
							<p className="summary-label">{stockSummaryLabel}</p>
							<strong>{inventory.isLoading ? "Загрузка" : `${stockUnits} шт`}</strong>
							<p className="summary-note">На распределителе</p>
						</div>
						<span className="commercial-overview-icon">
							<PackageCheck aria-hidden size={22} />
						</span>
					</div>
					<dl className="commercial-overview-metrics">
						<div>
							<dt>Стоимость</dt>
							<dd>{formatRubles(stockValueCents)}</dd>
						</div>
						<div>
							<dt>Позиций</dt>
							<dd>{stockItemCount}</dd>
						</div>
						{showCashBalance ? (
							<div>
								<dt>Наличные</dt>
								<dd>{cashBalances.isLoading ? "Загрузка" : formatRubles(cashAmountCents)}</dd>
							</div>
						) : null}
					</dl>
					{cashBalances.isError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}
				</div>
			) : (
				<div className="distributor-worker-overview worker-balance-overview">
					<div>
						<span>Стоимость</span>
						<strong>{formatRubles(stockValueCents)}</strong>
					</div>
					{showCashBalance ? (
						<div>
							<span>Наличные</span>
							<strong>{cashBalances.isLoading ? "Загрузка" : formatRubles(cashAmountCents)}</strong>
						</div>
					) : null}
				</div>
			)}

			{showCashBalance && summaryLayout !== "commercial" && cashBalances.isError ? (
				<span className="inline-error">Не удалось загрузить наличные</span>
			) : null}

			<div className="action-grid">
				<button
					aria-label="Открыть продажу"
					className="action-tile primary-action"
					disabled={saleDisabled}
					onClick={onSale}
					type="button"
				>
					<ReceiptText aria-hidden size={22} />
					<span>{saleDisabled ? "Продать — нет сети" : "Продать"}</span>
				</button>
			</div>

			{showStockList ? (
				<>
					<div className="section-heading">
						<h2>Продукция</h2>
						<span>{data?.summary.stockItemCount ?? 0} позиций</span>
					</div>
					{inventory.isLoading ? <p className="muted">Загрузка остатков распределителя</p> : null}
					{inventory.isError ? <p className="form-error">{inventory.error.message}</p> : null}
					{!inventory.isLoading && !inventory.isError && data?.items.length === 0 ? (
						<p className="muted">На распределителе пока нет продукции.</p>
					) : null}
					<DistributorStockList items={data?.items ?? []} />
				</>
			) : null}
		</section>
	);
}

function formatRubles(priceCents: number): string {
	return `${formatMoneyCents(moneyCents(priceCents))}\u00A0₽`;
}
