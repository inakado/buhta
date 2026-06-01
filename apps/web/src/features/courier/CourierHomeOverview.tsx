"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, PackageCheck, PackagePlus, ReceiptText } from "lucide-react";
import { formatMoneyCents, moneyCents } from "@buhta/shared";
import { getCourierCashBalances, getCourierProductBalances } from "../../lib/api-client";
import { CourierStockList } from "./CourierStockList";

type CourierHomeOverviewProps = {
	onLoad: () => void;
	onSale: () => void;
	online: boolean;
};

export function CourierHomeOverview({ onLoad, onSale, online }: CourierHomeOverviewProps) {
	const balances = useQuery({
		queryKey: ["courier", "product-balances"],
		queryFn: getCourierProductBalances,
	});
	const cashBalances = useQuery({
		queryKey: ["courier", "cash-balances"],
		queryFn: getCourierCashBalances,
	});
	const data = balances.data;
	const ownCashBalance = cashBalances.data?.items[0];

	return (
		<section className="screen-stack">
			<div className="section-heading compact">
				<h2>Мой баланс</h2>
				{balances.isFetching || cashBalances.isFetching ? <span>Обновление</span> : null}
			</div>

			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">Товар</p>
					<strong>{balances.isLoading ? "Загрузка" : `${data?.summary.totalUnits ?? 0} шт`}</strong>
					<p className="summary-note">
						Товарный баланс {formatRubles(data?.summary.totalStockValueCents ?? 0)} ₽
					</p>
				</div>
				<PackageCheck aria-hidden size={28} />
			</div>

			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">Наличные</p>
					<strong>{cashBalances.isLoading ? "Загрузка" : `${formatRubles(ownCashBalance?.amountCents ?? 0)} ₽`}</strong>
					<p className="summary-note">Баланс курьера</p>
					{cashBalances.isError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}
				</div>
				<Banknote aria-hidden size={28} />
			</div>

			<div className="action-grid">
				<button
					aria-label="Открыть продажу"
					className="action-tile primary-action"
					disabled={!online}
					onClick={onSale}
					type="button"
				>
					<ReceiptText aria-hidden size={22} />
					<span>Продать</span>
				</button>
				<button
					aria-label="Открыть загрузку"
					className="action-tile"
					disabled={!online}
					onClick={onLoad}
					type="button"
				>
					<PackagePlus aria-hidden size={22} />
					<span>Загрузить</span>
				</button>
			</div>

			<div className="section-heading">
				<h2>Мой остаток</h2>
				<span>{data?.summary.stockItemCount ?? 0} позиций</span>
			</div>
			{balances.isLoading ? <p className="muted">Загрузка баланса курьера</p> : null}
			{balances.isError ? <p className="form-error">{balances.error.message}</p> : null}
			{!balances.isLoading && !balances.isError && data?.items.length === 0 ? (
				<p className="muted">У курьера пока нет продукции.</p>
			) : null}
			<CourierStockList items={data?.items ?? []} />
		</section>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
