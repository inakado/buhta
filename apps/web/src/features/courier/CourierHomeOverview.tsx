"use client";

import { useQuery } from "@tanstack/react-query";
import { PackageMinus, PackagePlus, ReceiptText, type LucideIcon } from "lucide-react";
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
	const {
		data,
		error: balancesErrorValue,
		isError: balancesError,
		isFetching: balancesFetching,
		isLoading: balancesLoading,
	} = useQuery({
		queryKey: ["courier", "product-balances"],
		queryFn: getCourierProductBalances,
	});
	const {
		data: cashBalances,
		isError: cashBalancesError,
		isFetching: cashBalancesFetching,
		isLoading: cashBalancesLoading,
	} = useQuery({
		queryKey: ["courier", "cash-balances"],
		queryFn: getCourierCashBalances,
	});
	const ownCashBalance = cashBalances?.items[0];
	const isFetching = balancesFetching || cashBalancesFetching;
	const totalUnits = data?.summary.totalUnits ?? 0;
	const stockValueCents = data?.summary.totalStockValueCents ?? 0;
	const cashAmountCents = ownCashBalance?.amountCents ?? 0;

	return (
		<section className="screen-stack">
			<div className="section-heading compact">
				<h2>Мой баланс</h2>
				{isFetching ? <span>Обновление</span> : null}
			</div>

			<section className="production-home-surface courier-home-surface" aria-label="Сводка курьера">
				<div className="production-summary-ledger summary-horizontal courier-home-summary">
					<CourierSummaryCell label="Продукция" loading={balancesLoading} value={`${totalUnits} шт`} />
					<CourierSummaryCell label="Стоимость" loading={balancesLoading} value={formatCompactRubles(stockValueCents)} />
					<CourierSummaryCell
						label="Наличные"
						loading={cashBalancesLoading}
						value={formatCompactRubles(cashAmountCents)}
					/>
				</div>
			</section>
			{cashBalancesError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}

			<div className="production-command-panel courier-command-panel" aria-label="Действия курьера">
				<div className="production-command-group frequent" aria-label="Частые действия">
					<CourierCommandButton disabled={!online} icon={ReceiptText} label="Продать" onClick={onSale} tone="primary" />
				</div>
				<div className="production-command-group" aria-label="Движение продукции">
					<CourierCommandButton disabled={!online} icon={PackagePlus} label="Загрузить" onClick={onLoad} />
					<CourierCommandButton disabled={!online} icon={PackageMinus} label="Вернуть" onClick={onUnload} />
				</div>
				{!online ? <p className="production-command-note">Нет сети: операции записи недоступны</p> : null}
			</div>

			<div className="section-heading">
				<h2>Продукция</h2>
				<span>{data?.summary.stockItemCount ?? 0} позиций</span>
			</div>
			{balancesLoading ? <p className="muted">Загрузка баланса курьера</p> : null}
			{balancesError ? <p className="form-error">{balancesErrorValue.message}</p> : null}
			{!balancesLoading && !balancesError && data?.items.length === 0 ? (
				<p className="muted">У курьера пока нет продукции.</p>
			) : null}
			<div className="courier-home-stock-surface">
				<CourierStockList items={data?.items ?? []} />
			</div>
		</section>
	);
}

function CourierSummaryCell({ label, loading, value }: { label: string; loading: boolean; value: string }) {
	return (
		<div className="production-summary-row courier-summary-cell">
			<span className="production-summary-main">
				<span>{label}</span>
				<strong>{loading ? "..." : value}</strong>
			</span>
		</div>
	);
}

function CourierCommandButton({
	disabled,
	icon: Icon,
	label,
	onClick,
	tone = "neutral",
}: {
	disabled: boolean;
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	tone?: "neutral" | "primary";
}) {
	return (
		<button className={`production-command-button frequent ${tone}`} disabled={disabled} onClick={onClick} type="button">
			<Icon aria-hidden size={18} />
			<span>{label}</span>
		</button>
	);
}
