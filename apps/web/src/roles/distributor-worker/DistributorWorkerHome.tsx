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
			saleCommandTone="primary"
			saleDisabled={!online}
			showCashBalance={showCashBalance}
			showStockDistributorName={false}
			showSummaryMeta={false}
			showSummaryHeading={false}
			stockListSurface="worker-home"
			summaryVariant="horizontal"
			stockSummaryLabel="Продукция"
			stockValueLabel="Стоимость"
			title="Распределитель"
		/>
	);
}
