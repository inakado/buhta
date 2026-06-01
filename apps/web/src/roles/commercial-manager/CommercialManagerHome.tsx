"use client";

import { DistributorHomeOverview } from "../../features/distributor/DistributorHomeOverview";

type CommercialManagerHomeProps = {
	onTabChange: (tab: string) => void;
	online: boolean;
	showCashBalance?: boolean;
};

export function CommercialManagerHome({
	onTabChange,
	online,
	showCashBalance = false,
}: CommercialManagerHomeProps) {
	return (
		<DistributorHomeOverview
			onSale={() => onTabChange("sale")}
			saleDisabled={!online}
			showCashBalance={showCashBalance}
			showStockList={false}
			summaryLayout="commercial"
			stockSummaryLabel="Остаток распределителя"
			title="Продажи"
		/>
	);
}
