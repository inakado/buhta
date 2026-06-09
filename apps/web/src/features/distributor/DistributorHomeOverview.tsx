"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Banknote, ChevronRight, ClipboardList, ReceiptText, Send, type LucideIcon } from "lucide-react";
import { getDistributorCashBalances, getDistributorInventory } from "../../lib/api-client";
import { formatCompactRubles } from "../../lib/money-format";
import { DistributorStockList } from "./DistributorStockList";

type DistributorHomeOverviewProps = {
	onNotify?: () => void;
	onSale: () => void;
	onStockOpen?: () => void;
	notifyDisabled?: boolean;
	saleDisabled?: boolean;
	showCashBalance?: boolean;
	showStockList?: boolean;
	summaryMeta?: string;
	summaryTitle?: string;
	summaryLayout?: "default" | "commercial";
	stockSummaryLabel: string;
	title: string;
};

export function DistributorHomeOverview({
	onNotify,
	onSale,
	onStockOpen,
	notifyDisabled = false,
	saleDisabled = false,
	showCashBalance = false,
	showStockList = true,
	summaryMeta = "Сводка",
	summaryTitle = "Распределитель",
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
				<section className="production-home-surface commercial-home-surface" aria-labelledby="commercial-home-summary">
					<div className="production-home-heading">
						<h2 id="commercial-home-summary">{summaryTitle}</h2>
						<span>{summaryMeta}</span>
					</div>
					<div className="production-summary-ledger" aria-label="Сводка распределителя">
						<CommercialSummaryRow
							icon={BadgeCheck}
							label={stockSummaryLabel}
							loading={inventory.isLoading}
							meta={formatPositionCount(stockItemCount)}
							value={`${stockUnits} шт`}
							{...(onStockOpen ? { onClick: onStockOpen } : {})}
						/>
						<CommercialSummaryRow
							icon={ClipboardList}
							label="Стоимость продукции"
							loading={inventory.isLoading}
							meta="По текущей цене"
							value={formatCompactRubles(stockValueCents)}
						/>
						{showCashBalance ? (
							<CommercialSummaryRow
								icon={Banknote}
								label="Наличные"
								loading={cashBalances.isLoading}
								meta="В кассе"
								value={formatCompactRubles(cashAmountCents)}
							/>
						) : null}
					</div>
					{cashBalances.isError ? <span className="inline-error">Не удалось загрузить наличные</span> : null}
				</section>
			) : (
				<div className="compact-balance-overview">
					<div>
						<span>Продукция</span>
						<strong>{formatCompactRubles(stockValueCents)}</strong>
					</div>
					{showCashBalance ? (
						<div>
							<span>Наличные</span>
							<strong>{cashBalances.isLoading ? "Загрузка" : formatCompactRubles(cashAmountCents)}</strong>
						</div>
					) : null}
				</div>
			)}

			{showCashBalance && summaryLayout !== "commercial" && cashBalances.isError ? (
				<span className="inline-error">Не удалось загрузить наличные</span>
			) : null}

			{summaryLayout === "commercial" ? (
				<div className="production-command-panel" aria-label="Действия продаж">
					<div className="production-command-group frequent" aria-label="Частые действия">
						<CommercialCommandButton
							disabled={saleDisabled}
							icon={ReceiptText}
							label="Продать"
							onClick={onSale}
						/>
						{onNotify ? (
							<CommercialCommandButton
								disabled={notifyDisabled}
								icon={Send}
								label="Уведомить"
								onClick={onNotify}
							/>
						) : null}
					</div>
					{saleDisabled || notifyDisabled ? <p className="production-command-note">Нет сети: операции записи недоступны</p> : null}
				</div>
			) : (
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
					{onNotify ? (
						<button
							aria-label="Уведомить производство"
							className="action-tile"
							disabled={notifyDisabled}
							onClick={onNotify}
							type="button"
						>
							<Send aria-hidden size={22} />
							<span>{notifyDisabled ? "Уведомить — нет сети" : "Уведомить"}</span>
						</button>
					) : null}
				</div>
			)}

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

function CommercialSummaryRow({
	icon: Icon,
	label,
	loading,
	meta,
	onClick,
	value,
}: {
	icon: LucideIcon;
	label: string;
	loading: boolean;
	meta: string;
	onClick?: () => void;
	value: string;
}) {
	const displayValue = loading ? "..." : value;
	const displayMeta = loading ? "Загрузка" : meta;
	const content = (
		<>
			<span className="production-summary-icon" aria-hidden>
				<Icon size={17} />
			</span>
			<span className="production-summary-main">
				<span>{label}</span>
				<strong>{displayValue}</strong>
			</span>
			<span className="production-summary-meta">
				<span>{displayMeta}</span>
				{onClick ? <ChevronRight aria-hidden size={16} /> : null}
			</span>
		</>
	);

	if (onClick) {
		return (
			<button
				aria-label={`${label}: ${displayValue}, ${displayMeta}. Открыть список`}
				className="production-summary-row commercial-summary-row"
				disabled={loading}
				onClick={onClick}
				type="button"
			>
				{content}
			</button>
		);
	}

	return <div className="production-summary-row commercial-summary-row static">{content}</div>;
}

function CommercialCommandButton({
	disabled,
	icon: Icon,
	label,
	onClick,
}: {
	disabled: boolean;
	icon: LucideIcon;
	label: string;
	onClick: () => void;
}) {
	return (
		<button className="production-command-button frequent" disabled={disabled} onClick={onClick} type="button">
			<Icon aria-hidden size={18} />
			<span>{label}</span>
		</button>
	);
}

function formatPositionCount(count: number): string {
	const lastTwoDigits = Math.abs(count) % 100;
	const lastDigit = Math.abs(count) % 10;
	const word = lastTwoDigits >= 11 && lastTwoDigits <= 14
		? "позиций"
		: lastDigit === 1
			? "позиция"
			: lastDigit >= 2 && lastDigit <= 4
				? "позиции"
				: "позиций";

	return `${count} ${word}`;
}
