"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, PackageCheck, ReceiptText } from "lucide-react";
import { formatMoneyCents, moneyCents } from "@buhta/shared";
import { DistributorStockList } from "../../features/distributor/DistributorStockList";
import { getDistributorCashBalances, getDistributorInventory } from "../../lib/api-client";

type CommercialManagerHomeProps = {
	onTabChange: (tab: string) => void;
	showCashBalance?: boolean;
};

export function CommercialManagerHome({ onTabChange, showCashBalance = false }: CommercialManagerHomeProps) {
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

	return (
		<section className="screen-stack">
			<div className="section-heading compact">
				<h2>Продажи</h2>
				{inventory.isFetching || cashBalances.isFetching ? <span>Обновление</span> : null}
			</div>

			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">Остаток распределителя</p>
					<strong>{inventory.isLoading ? "Загрузка" : `${data?.summary.totalUnits ?? 0} шт`}</strong>
					<p className="summary-note">
						Товарный баланс {formatRubles(data?.summary.totalStockValueCents ?? 0)} ₽
					</p>
				</div>
				<PackageCheck aria-hidden size={28} />
			</div>

			{showCashBalance ? (
				<div className="summary-card compact-summary">
					<div>
						<p className="summary-label">Наличные</p>
						<strong>{cashBalances.isLoading ? "Загрузка" : `${formatRubles(cashBalances.data?.totalAmountCents ?? 0)} ₽`}</strong>
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
					onClick={() => onTabChange("sale")}
					type="button"
				>
					<ReceiptText aria-hidden size={22} />
					<span>Продать</span>
				</button>
			</div>

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
		</section>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
