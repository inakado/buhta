"use client";

import { Settings, type LucideIcon } from "lucide-react";
import { CatalogHome } from "../features/catalog/CatalogHome";
import { DirectorAnalyticsHome } from "../features/analytics/DirectorAnalyticsHome";
import { ClientsHome } from "../features/clients/ClientsHome";
import { CourierBalanceHome } from "../features/courier/CourierBalanceHome";
import { CourierLoadHome } from "../features/courier/CourierLoadHome";
import { CourierSaleHome } from "../features/courier/CourierSaleHome";
import { CourierUnloadHome } from "../features/courier/CourierUnloadHome";
import { DistributorInventoryHome } from "../features/distributor/DistributorInventoryHome";
import { NotificationsHome } from "../features/notifications/NotificationsHome";
import { RoleOnboardingHome } from "../features/onboarding/RoleOnboardingHome";
import { OperationHistoryHome } from "../features/operations/OperationHistoryHome";
import { ProductionHome } from "../features/production/ProductionHome";
import { DistributorSaleHome } from "../features/sales/DistributorSaleHome";
import { SalesHistoryHome } from "../features/sales/SalesHistoryHome";
import type { CurrentActor } from "../lib/api-client";
import { AdminHome } from "../roles/admin/AdminHome";
import { AdminMoreHome } from "../roles/admin/AdminMoreHome";
import { CommercialMoreHome } from "../roles/commercial-manager/CommercialMoreHome";
import { CommercialManagerHome } from "../roles/commercial-manager/CommercialManagerHome";
import { CourierHome } from "../roles/courier/CourierHome";
import { CourierMoreHome } from "../roles/courier/CourierMoreHome";
import { DirectorMoreHome } from "../roles/director/DirectorMoreHome";
import { DirectorStockHome } from "../roles/director/DirectorStockHome";
import { DistributorWorkerHome } from "../roles/distributor-worker/DistributorWorkerHome";
import { DistributorWorkerMoreHome } from "../roles/distributor-worker/DistributorWorkerMoreHome";
import { ProductionMoreHome } from "../roles/production-manager/ProductionMoreHome";

type RoleHomeRouterProps = {
	actor: CurrentActor;
	activeTab: string;
	logout: () => void;
	logoutPending: boolean;
	online: boolean;
	onStatusSuccess: (message: string) => void;
	onTabChange: (tab: string) => void;
};

export function RoleHomeRouter({
	actor,
	activeTab,
	logout,
	logoutPending,
	online,
	onStatusSuccess,
	onTabChange,
}: RoleHomeRouterProps) {
	if (actor.role === "director" && activeTab === "more") {
		return (
			<DirectorMoreHome
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onStatusSuccess}
				onTabChange={onTabChange}
				online={online}
			/>
		);
	}

	if (actor.role === "production_manager" && activeTab === "more") {
		return (
			<ProductionMoreHome
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onStatusSuccess}
				onTabChange={onTabChange}
				online={online}
			/>
		);
	}

	if (actor.role === "commercial_manager" && activeTab === "more") {
		return (
			<CommercialMoreHome
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onStatusSuccess}
				onTabChange={onTabChange}
				online={online}
			/>
		);
	}

	if (actor.role === "distributor_worker" && activeTab === "more") {
		return (
			<DistributorWorkerMoreHome
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onStatusSuccess}
				online={online}
			/>
		);
	}

	if (actor.role === "courier" && activeTab === "more") {
		return (
			<CourierMoreHome
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onStatusSuccess}
				onTabChange={onTabChange}
				online={online}
			/>
		);
	}

	if (actor.role === "admin" && activeTab === "more") {
		return (
			<AdminMoreHome
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onStatusSuccess}
				online={online}
			/>
		);
	}

	if (activeTab === "catalog" && hasCatalogAccess(actor)) {
		return <CatalogHome actor={actor} online={online} />;
	}

	if (activeTab === "clients" && actor.permissions.includes("client.read")) {
		return <ClientsHome actor={actor} online={online} />;
	}

	if (
		activeTab === "couriers"
		&& actor.permissions.includes("courier.stock.read")
		&& (actor.role === "director" || actor.role === "commercial_manager")
	) {
		return <CourierBalanceHome variant="director-stock" />;
	}

	if (activeTab === "notifications" && actor.permissions.includes("notification.read")) {
		return <NotificationsHome actor={actor} online={online} />;
	}

	if (activeTab === "operation-history" && actor.permissions.includes("operation.history.read")) {
		return <OperationHistoryHome />;
	}

	if (
		(activeTab === "analytics" || activeTab === "home")
		&& actor.role === "director"
		&& actor.permissions.includes("director.analytics.read")
	) {
		return <DirectorAnalyticsHome title={activeTab === "home" ? "Главная" : "Аналитика"} />;
	}

	if (
		activeTab === "stock"
		&& actor.role === "director"
		&& (actor.permissions.includes("distributor.stock.read") || actor.permissions.includes("courier.stock.read"))
	) {
		return <DirectorStockHome actor={actor} online={online} />;
	}

	if (actor.role === "production_manager") {
		if (activeTab === "onboarding") {
			return <RoleOnboardingHome targetRole="production_manager" />;
		}
		if (activeTab === "distributor") {
			return (
				<DistributorInventoryHome
					title="На распределителе"
					variant="stock-ledger"
				/>
			);
		}
		if (isProductionTab(activeTab)) {
			return (
				<ProductionHome
					activeTab={activeTab}
					online={online}
				/>
			);
		}
	}

	if (actor.role === "admin") {
		if (activeTab !== "people") {
			return <PlaceholderScreen title="Раздел" text="Раздел недоступен для текущей роли." icon={Settings} />;
		}

		return <AdminHome actor={actor} onActionSuccess={onStatusSuccess} online={online} />;
	}

	if (
		activeTab === "distributor"
		&& actor.role === "commercial_manager"
		&& actor.permissions.includes("distributor.stock.read")
	) {
		return (
			<DistributorInventoryHome
				canAssignDiscount={actor.permissions.includes("discount.assign")}
				hideOverview
				onBack={() => onTabChange("home")}
				online={online}
				title="Продукция"
				variant="stock-ledger"
			/>
		);
	}

	if (actor.role === "commercial_manager" && activeTab === "onboarding") {
		return <RoleOnboardingHome targetRole="commercial_manager" />;
	}

	if (activeTab !== "home") {
		if (
			activeTab === "sales-history"
			&& (
				(actor.role === "courier" && actor.permissions.includes("courier.sale.create"))
				|| ((actor.role === "commercial_manager" || actor.role === "distributor_worker")
					&& actor.permissions.includes("distributor.sale.create"))
			)
		) {
			return <SalesHistoryHome actor={actor} online={online} />;
		}
		if (activeTab === "load" && actor.permissions.includes("courier.stock.load")) {
			return (
				<CourierLoadHome
					onDone={() => onTabChange("home")}
					online={online}
				/>
			);
		}
		if (activeTab === "sale" && actor.permissions.includes("distributor.sale.create")) {
			return (
				<DistributorSaleHome
					onBack={() => onTabChange("home")}
					onDone={() => onTabChange("home")}
					online={online}
				/>
			);
		}
		if (activeTab === "sale" && actor.permissions.includes("courier.sale.create")) {
			return (
				<CourierSaleHome
					onDone={() => onTabChange("home")}
					online={online}
				/>
			);
		}
		if (activeTab === "unload" && actor.permissions.includes("courier.unload.create")) {
			return (
				<CourierUnloadHome
					onDone={() => onTabChange("home")}
					online={online}
				/>
			);
		}
		const tabTitle = activeTab === "sale" ? "Продажа" : "Профиль";
		return <PlaceholderScreen title={tabTitle} text="Раздел будет подключен на следующем этапе." icon={Settings} />;
	}

	if (actor.permissions.includes("distributor.stock.read")) {
		if (actor.role === "director") {
			return <DirectorStockHome actor={actor} online={online} />;
		}

		if (actor.role === "courier") {
			return <CourierHome online={online} onTabChange={onTabChange} />;
		}

		if (actor.role === "commercial_manager") {
			return (
				<CommercialManagerHome
					canNotifyProduction={actor.permissions.includes("notification.read")}
					online={online}
					onTabChange={onTabChange}
					showCashBalance={actor.permissions.includes("distributor.cash.read")}
				/>
			);
		}

		if (actor.role === "distributor_worker") {
			return (
				<DistributorWorkerHome
					online={online}
					onTabChange={onTabChange}
					showCashBalance={actor.permissions.includes("distributor.cash.read")}
				/>
			);
		}

		return <DistributorInventoryHome showCashBalance={actor.permissions.includes("distributor.cash.read")} />;
	}

	return <PlaceholderScreen title="Главная" text="Раздел недоступен для текущей роли." icon={Settings} />;
}

function PlaceholderScreen({
	icon: Icon,
	text,
	title,
}: {
	icon: LucideIcon;
	text: string;
	title: string;
}) {
	return (
		<section className="screen-stack">
			<div className="placeholder-panel">
				<div>
					<h2>{title}</h2>
					<p>{text}</p>
				</div>
				<Icon aria-hidden size={22} />
			</div>
		</section>
	);
}

function isProductionTab(tab: string): tab is "home" | "history" {
	return tab === "home" || tab === "history";
}

function hasCatalogAccess(actor: CurrentActor): boolean {
	return actor.permissions.includes("catalog.manage")
		|| actor.permissions.includes("catalog.raw_material.manage")
		|| actor.permissions.includes("catalog.packaging.manage");
}
