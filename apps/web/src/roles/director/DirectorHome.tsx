"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, BarChart2, History, PackageCheck, Shield, Tag, Truck, type LucideIcon } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
	type CourierCashBalanceItem,
} from "@buhta/shared";
import { CourierStockList } from "../../features/courier/CourierStockList";
import { DistributorStockList } from "../../features/distributor/DistributorStockList";
import {
	getCourierCashBalances,
	getCourierProductBalances,
	getDistributorCashBalances,
	getDistributorInventory,
} from "../../lib/api-client";

export function DirectorHome() {
	const distributorInventory = useQuery({
		queryKey: ["distributor", "inventory"],
		queryFn: getDistributorInventory,
	});
	const distributorCash = useQuery({
		queryKey: ["distributor", "cash-balances"],
		queryFn: getDistributorCashBalances,
	});
	const courierBalances = useQuery({
		queryKey: ["courier", "product-balances"],
		queryFn: getCourierProductBalances,
	});
	const courierCash = useQuery({
		queryKey: ["courier", "cash-balances"],
		queryFn: getCourierCashBalances,
	});
	const distributorUnits = distributorInventory.data?.summary.totalUnits ?? 0;
	const courierUnits = courierBalances.data?.summary.totalUnits ?? 0;
	const distributorStockValueCents = distributorInventory.data?.summary.totalStockValueCents ?? 0;
	const courierStockValueCents = courierBalances.data?.summary.totalStockValueCents ?? 0;
	const distributorCashCents = distributorCash.data?.totalAmountCents ?? 0;
	const courierCashCents = courierCash.data?.totalAmountCents ?? 0;
	const totalUnits = distributorUnits + courierUnits;
	const totalCashCents = distributorCashCents + courierCashCents;
	const isFetching = distributorInventory.isFetching
		|| distributorCash.isFetching
		|| courierBalances.isFetching
		|| courierCash.isFetching;

	return (
		<section className="screen-stack">
			<div className="section-heading compact">
				<h2>Контроль</h2>
				{isFetching ? <span>Обновление</span> : null}
			</div>

			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">В обороте</p>
					<strong>{totalUnits} шт</strong>
					<p className="summary-note">
						Распределитель {distributorUnits} шт · курьеры {courierUnits} шт
					</p>
				</div>
				<Shield aria-hidden size={28} />
			</div>

			<div className="director-metric-grid">
				<div className="entity-card director-metric-card">
					<div className="production-row-icon">
						<Banknote aria-hidden size={18} />
					</div>
					<div>
						<p>Наличные в системе</p>
						<strong>{formatRubles(totalCashCents)} ₽</strong>
						<span>Распред. {formatRubles(distributorCashCents)} ₽ · курьеры {formatRubles(courierCashCents)} ₽</span>
					</div>
				</div>
				<div className="entity-card director-metric-card">
					<div className="production-row-icon">
						<PackageCheck aria-hidden size={18} />
					</div>
					<div>
						<p>Товарный баланс</p>
						<strong>{formatRubles(distributorStockValueCents + courierStockValueCents)} ₽</strong>
						<span>Распред. + курьеры</span>
					</div>
				</div>
			</div>

			<div className="section-heading">
				<h2>Управление</h2>
				<span>Недоступно</span>
			</div>
			<div className="action-grid">
				{directorActions.map((action) => (
					<button
						aria-label={`${action.label} пока недоступно`}
						className="action-tile unavailable-action"
						disabled
						key={action.label}
						type="button"
					>
						<action.icon aria-hidden size={22} />
						<span>{action.label}</span>
						<small>Нужен backend этап</small>
					</button>
				))}
			</div>

			<div className="section-heading">
				<h2>Распределитель</h2>
				<span>{distributorInventory.data?.summary.stockItemCount ?? 0} позиций</span>
			</div>
			{distributorInventory.isLoading ? <p className="muted">Загрузка остатков распределителя</p> : null}
			{distributorInventory.isError ? <p className="form-error">{distributorInventory.error.message}</p> : null}
			<DistributorStockList items={distributorInventory.data?.items ?? []} />

			<div className="section-heading">
				<h2>Курьеры</h2>
				<span>{courierBalances.data?.summary.stockItemCount ?? 0} позиций</span>
			</div>
			<DirectorCourierCashList
				isError={courierCash.isError}
				isLoading={courierCash.isLoading}
				items={courierCash.data?.items ?? []}
			/>
			{courierBalances.isLoading ? <p className="muted">Загрузка балансов курьеров</p> : null}
			{courierBalances.isError ? <p className="form-error">{courierBalances.error.message}</p> : null}
			<CourierStockList items={courierBalances.data?.items ?? []} showCourier />
		</section>
	);
}

function DirectorCourierCashList({
	isError,
	isLoading,
	items,
}: {
	isError: boolean;
	isLoading: boolean;
	items: CourierCashBalanceItem[];
}) {
	return (
		<div className="production-stock-stack">
			{isLoading ? <p className="muted">Загрузка cash-балансов курьеров</p> : null}
			{isError ? <p className="form-error">Не удалось загрузить cash-балансы курьеров</p> : null}
			{items.map((item) => (
				<div className="stock-aggregate-card" key={item.courierUserId}>
					<div className="production-row-icon">
						<Truck aria-hidden size={18} />
					</div>
					<div className="stock-aggregate-body">
						<strong>{item.courierDisplayName}</strong>
						<p>@{item.courierLogin} · наличные</p>
					</div>
					<div className="stock-aggregate-value">
						<strong>{formatRubles(item.amountCents)} ₽</strong>
						<span>{item.updatedAt ? "Есть операции" : "0 ₽ без операций"}</span>
					</div>
				</div>
			))}
		</div>
	);
}

const directorActions = [
	{ icon: Tag, label: "Назначить дисконт" },
	{ icon: Banknote, label: "Списать наличные" },
	{ icon: BarChart2, label: "Отчеты" },
	{ icon: History, label: "История" },
] as const satisfies { icon: LucideIcon; label: string }[];

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
