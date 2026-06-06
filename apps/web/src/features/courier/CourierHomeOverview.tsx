"use client";

import { useQuery } from "@tanstack/react-query";
import { PackageMinus, PackagePlus, ReceiptText } from "lucide-react";
import { getCourierCashBalances, getCourierProductBalances } from "../../lib/api-client";
import { formatCompactRubles } from "../../lib/money-format";
import { CourierStockList } from "./CourierStockList";

type CourierHomeOverviewProps = {
	onLoad: () => void;
	onSale: () => void;
	onUnload: () => void;
	online: boolean;
};

export function CourierHomeOverview({ onLoad, onSale, onUnload, online }: CourierHomeOverviewProps) {
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

			<div className="compact-balance-overview courier-home-overview">
				<div>
					<span>Продукция</span>
					<strong>{formatCompactRubles(data?.summary.totalStockValueCents ?? 0)}</strong>
				</div>
				<div>
					<span>Наличные</span>
					<strong>{cashBalances.isLoading ? "Загрузка" : formatCompactRubles(ownCashBalance?.amountCents ?? 0)}</strong>
				</div>
			</div>
			{cashBalances.isError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}

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
				<button
					aria-label="Открыть возврат"
					className="action-tile"
					disabled={!online}
					onClick={onUnload}
					type="button"
				>
					<PackageMinus aria-hidden size={22} />
					<span>Вернуть</span>
				</button>
			</div>

			<div className="section-heading">
				<h2>Продукция</h2>
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
