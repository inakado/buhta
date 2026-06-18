"use client";

import { DistributorHomeOverview } from "../../features/distributor/DistributorHomeOverview";

type CommercialManagerHomeProps = {
	canNotifyProduction?: boolean;
	onTabChange: (tab: string) => void;
	online: boolean;
	showCashBalance?: boolean;
};

export function CommercialManagerHome({
	canNotifyProduction = false,
	onTabChange,
	online,
	showCashBalance = false,
}: CommercialManagerHomeProps) {
	return (
		<DistributorHomeOverview
			{...(canNotifyProduction ? { onNotify: () => onTabChange("notifications") } : {})}
			onSale={() => onTabChange("sale")}
			onStockOpen={() => onTabChange("distributor")}
			notifyDisabled={!online}
			saleDisabled={!online}
			showCashBalance={showCashBalance}
			showScreenHeading={false}
			showStockList={false}
			stockSummaryLabel="Остаток распределителя"
			title="Продажи"
		/>
	);
}
