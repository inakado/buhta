"use client";

import { LogOut, Settings, Shield, type LucideIcon } from "lucide-react";
import { CatalogHome } from "../features/catalog/CatalogHome";
import { ClientsHome } from "../features/clients/ClientsHome";
import { CourierBalanceHome } from "../features/courier/CourierBalanceHome";
import { CourierLoadHome } from "../features/courier/CourierLoadHome";
import { CourierSaleHome } from "../features/courier/CourierSaleHome";
import { CourierUnloadHome } from "../features/courier/CourierUnloadHome";
import { DistributorInventoryHome } from "../features/distributor/DistributorInventoryHome";
import { NotificationsHome } from "../features/notifications/NotificationsHome";
import { ProductionHome } from "../features/production/ProductionHome";
import { DistributorSaleHome } from "../features/sales/DistributorSaleHome";
import { ROLE_LABELS } from "../lib/role-labels";
import type { CurrentActor } from "../lib/api-client";
import { AdminHome } from "../roles/admin/AdminHome";
import { CommercialManagerHome } from "../roles/commercial-manager/CommercialManagerHome";
import { CourierHome } from "../roles/courier/CourierHome";
import { DirectorHome } from "../roles/director/DirectorHome";
import { DistributorWorkerHome } from "../roles/distributor-worker/DistributorWorkerHome";

type RoleHomeRouterProps = {
	actor: CurrentActor;
	activeTab: string;
	logout: () => void;
	logoutPending: boolean;
	online: boolean;
	onActionSuccess: (message: string) => void;
	onTabChange: (tab: string) => void;
};

export function RoleHomeRouter({
	actor,
	activeTab,
	logout,
	logoutPending,
	online,
	onActionSuccess,
	onTabChange,
}: RoleHomeRouterProps) {
	if (activeTab === "settings") {
		return <SettingsScreen actor={actor} logout={logout} logoutPending={logoutPending} />;
	}

	if (activeTab === "catalog" && actor.permissions.includes("catalog.manage")) {
		return <CatalogHome online={online} />;
	}

	if (activeTab === "clients" && actor.permissions.includes("client.read")) {
		return <ClientsHome actor={actor} online={online} />;
	}

	if (
		activeTab === "couriers"
		&& actor.permissions.includes("courier.stock.read")
		&& (actor.role === "director" || actor.role === "commercial_manager")
	) {
		return <CourierBalanceHome mode="all" />;
	}

	if (activeTab === "notifications" && actor.permissions.includes("notification.read")) {
		return <NotificationsHome actor={actor} online={online} />;
	}

	if (actor.role === "production_manager") {
		if (activeTab === "distributor") {
			return (
				<DistributorInventoryHome
					showCashBalance={actor.permissions.includes("distributor.cash.read")}
					title="На распределителе"
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
			return <PlaceholderScreen title="Аудит" text="Журнал действий будет подключен следующим экраном." icon={Shield} />;
		}

		return <AdminHome actor={actor} />;
	}

	if (
		activeTab === "distributor"
		&& (actor.role === "commercial_manager" || actor.role === "director")
		&& actor.permissions.includes("distributor.stock.read")
	) {
		return (
			<DistributorInventoryHome
				canWithdrawCash={actor.role === "director" && actor.permissions.includes("cash.withdraw")}
				online={online}
				showCashBalance={actor.permissions.includes("distributor.cash.read")}
				title={actor.role === "director" ? "Распределитель" : "Остатки"}
			/>
		);
	}

	if (activeTab !== "home") {
		if (activeTab === "load" && actor.permissions.includes("courier.stock.load")) {
			return (
				<CourierLoadHome
					onLoadSuccess={() => onActionSuccess("Загрузка записана")}
					online={online}
				/>
			);
		}
		if (activeTab === "sale" && actor.permissions.includes("distributor.sale.create")) {
			return (
				<DistributorSaleHome
					onSaleSuccess={() => onActionSuccess("Продажа записана")}
					online={online}
				/>
			);
		}
		if (activeTab === "sale" && actor.permissions.includes("courier.sale.create")) {
			return (
				<CourierSaleHome
					onSaleSuccess={() => onActionSuccess("Продажа записана")}
					online={online}
				/>
			);
		}
		if (activeTab === "unload" && actor.permissions.includes("courier.unload.create")) {
			return (
				<CourierUnloadHome
					onUnloadSuccess={() => onActionSuccess("Возврат записан")}
					online={online}
				/>
			);
		}
		const tabTitle = activeTab === "sale" ? "Продажа" : "Профиль";
		return <PlaceholderScreen title={tabTitle} text="Раздел будет подключен на следующем этапе." icon={Settings} />;
	}

	if (actor.permissions.includes("distributor.stock.read")) {
		if (actor.role === "director") {
			return <DirectorHome />;
		}

		if (actor.role === "courier") {
			return <CourierHome online={online} onTabChange={onTabChange} />;
		}

		if (actor.role === "commercial_manager") {
			return (
				<CommercialManagerHome
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

function SettingsScreen({
	actor,
	logout,
	logoutPending,
}: {
	actor: CurrentActor;
	logout: () => void;
	logoutPending: boolean;
}) {
	return (
		<section className="screen-stack">
			<div className="section-heading">
				<h2>Настройки</h2>
			</div>

			<div className="settings-panel">
				<div className="section-heading compact">
					<h2>{actor.displayName}</h2>
					<span>{ROLE_LABELS[actor.role]}</span>
				</div>
				<div className="settings-row">
					<span>Логин</span>
					<strong>@{actor.login}</strong>
				</div>
				<button className="primary-button danger-button" disabled={logoutPending} onClick={logout} type="button">
					<LogOut aria-hidden size={18} />
					{logoutPending ? "Выходим" : "Выйти"}
				</button>
			</div>
		</section>
	);
}

function isProductionTab(tab: string): tab is "home" | "history" {
	return tab === "home" || tab === "history";
}
