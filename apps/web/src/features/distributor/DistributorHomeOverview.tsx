"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, PackageCheck, ReceiptText } from "lucide-react";
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
				<div className="summary-card commercial-summary-card">
					<div className="commercial-summary-head">
						<div>
							<p className="summary-label">{stockSummaryLabel}</p>
							<strong>{inventory.isLoading ? "Загрузка" : `${stockUnits} шт`}</strong>
							<p className="summary-note">На распределителе</p>
						</div>
						<span className="commercial-summary-icon">
							<PackageCheck aria-hidden size={22} />
						</span>
					</div>
					<dl className="commercial-summary-grid">
						<div>
							<dt>Стоимость</dt>
							<dd>{formatRubles(stockValueCents)} ₽</dd>
						</div>
						<div>
							<dt>Позиций</dt>
							<dd>{stockItemCount}</dd>
						</div>
						{showCashBalance ? (
							<div>
								<dt>Наличные</dt>
								<dd>{cashBalances.isLoading ? "Загрузка" : `${formatRubles(cashAmountCents)} ₽`}</dd>
							</div>
						) : null}
					</dl>
					{cashBalances.isError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}
				</div>
			) : (
				<div className="summary-card compact-summary">
					<div>
						<p className="summary-label">{stockSummaryLabel}</p>
						<strong>{inventory.isLoading ? "Загрузка" : `${stockUnits} шт`}</strong>
						<p className="summary-note">
							Товарный баланс {formatRubles(stockValueCents)} ₽
						</p>
					</div>
					<PackageCheck aria-hidden size={28} />
				</div>
			)}

			{showCashBalance && summaryLayout !== "commercial" ? (
				<div className="summary-card compact-summary">
					<div>
						<p className="summary-label">Наличные</p>
						<strong>{cashBalances.isLoading ? "Загрузка" : `${formatRubles(cashAmountCents)} ₽`}</strong>
						<p className="summary-note">На распределителе</p>
						{cashBalances.isError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}
					</div>
					<Banknote aria-hidden size={28} />
				</div>
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
						<h2>Остатки</h2>
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
	return formatMoneyCents(moneyCents(priceCents));
}
