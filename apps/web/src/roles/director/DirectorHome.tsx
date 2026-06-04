"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, Box, Shield, Truck, type LucideIcon } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
} from "@buhta/shared";
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
	const totalStockValueCents = distributorStockValueCents + courierStockValueCents;
	const totalUnits = distributorUnits + courierUnits;
	const totalCashCents = distributorCashCents + courierCashCents;
	const isFetching = distributorInventory.isFetching
		|| distributorCash.isFetching
		|| courierBalances.isFetching
		|| courierCash.isFetching;

	return (
		<section className="screen-stack director-home">
			{isFetching ? <p className="muted">Обновление</p> : null}

			<div className="director-overview-card">
				<div className="director-overview-main">
					<div>
						<p>В обороте</p>
						<strong>{totalUnits} шт</strong>
						<span>{formatRubles(totalStockValueCents)} ₽ товаром</span>
					</div>
					<div>
						<Shield aria-hidden size={28} />
					</div>
				</div>
				<div className="director-overview-cash">
					<Banknote aria-hidden size={18} />
					<div>
						<span>Наличные</span>
						<strong>{formatRubles(totalCashCents)} ₽</strong>
					</div>
				</div>
			</div>

			<div className="director-contour-list">
				<DirectorContourRow
					icon={Box}
					label="Распределитель"
					cashCents={distributorCashCents}
					stockValueCents={distributorStockValueCents}
					units={distributorUnits}
				/>
				<DirectorContourRow
					icon={Truck}
					label="Курьеры"
					cashCents={courierCashCents}
					stockValueCents={courierStockValueCents}
					units={courierUnits}
				/>
			</div>

			{distributorInventory.isError ? <p className="form-error">{distributorInventory.error.message}</p> : null}
			{distributorCash.isError ? <p className="form-error">Не удалось загрузить наличные распределителя</p> : null}
			{courierBalances.isError ? <p className="form-error">{courierBalances.error.message}</p> : null}
			{courierCash.isError ? <p className="form-error">Не удалось загрузить наличные курьеров</p> : null}
		</section>
	);
}

function DirectorContourRow({
	cashCents,
	icon: Icon,
	label,
	stockValueCents,
	units,
}: {
	cashCents: number;
	icon: LucideIcon;
	label: string;
	stockValueCents: number;
	units: number;
}) {
	return (
		<div className="director-contour-row">
			<div className="director-contour-title">
				<Icon aria-hidden size={18} />
				<div>
					<strong>{label}</strong>
					<span>{units} шт</span>
				</div>
			</div>
			<div className="director-contour-values">
				<div>
					<span>Товар</span>
					<strong>{formatRubles(stockValueCents)} ₽</strong>
				</div>
				<div>
					<span>Наличные</span>
					<strong>{formatRubles(cashCents)} ₽</strong>
				</div>
			</div>
		</div>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
