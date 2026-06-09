"use client";

import { DistributorHomeOverview } from "../../features/distributor/DistributorHomeOverview";

type DistributorWorkerHomeProps = {
	onTabChange: (tab: string) => void;
	online: boolean;
	showCashBalance?: boolean;
};

export function DistributorWorkerHome({
	onTabChange,
	online,
	showCashBalance = false,
}: DistributorWorkerHomeProps) {
	return (
		<DistributorHomeOverview
			onSale={() => onTabChange("sale")}
			saleDisabled={!online}
			showCashBalance={showCashBalance}
			summaryLayout="commercial"
			summaryMeta="Распределитель"
			summaryTitle="Сводка"
			stockSummaryLabel="Продукция"
			title="Распределитель"
		/>
	);
}
