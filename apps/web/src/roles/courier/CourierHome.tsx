"use client";

import { CourierHomeOverview } from "../../features/courier/CourierHomeOverview";

type CourierHomeProps = {
	onTabChange: (tab: string) => void;
	online: boolean;
};

export function CourierHome({ onTabChange, online }: CourierHomeProps) {
	return (
		<CourierHomeOverview
			onLoad={() => onTabChange("load")}
			onSale={() => onTabChange("sale")}
			onUnload={() => onTabChange("unload")}
			online={online}
		/>
	);
}
