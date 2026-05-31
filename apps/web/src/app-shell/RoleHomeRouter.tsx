"use client";

import { Box, LogOut, PackageCheck, ReceiptText, Settings, Shield, Truck, type LucideIcon } from "lucide-react";
import type { Role } from "@buhta/shared";
import { CatalogHome } from "../features/catalog/CatalogHome";
import { ClientsHome } from "../features/clients/ClientsHome";
import { CourierBalanceHome } from "../features/courier/CourierBalanceHome";
import { CourierLoadHome } from "../features/courier/CourierLoadHome";
import { CourierSaleHome } from "../features/courier/CourierSaleHome";
import { DistributorInventoryHome } from "../features/distributor/DistributorInventoryHome";
import { ProductionHome } from "../features/production/ProductionHome";
import { DistributorSaleHome } from "../features/sales/DistributorSaleHome";
import { ROLE_LABELS } from "../lib/role-labels";
import type { CurrentActor } from "../lib/api-client";
import { AdminHome } from "../roles/admin/AdminHome";

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
	onTabChange: _onTabChange,
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

	if (actor.role === "production_manager") {
		if (activeTab === "distributor") {
			return <DistributorInventoryHome showCashBalance={actor.permissions.includes("distributor.cash.read")} />;
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
		const tabTitle = activeTab === "sale" ? "Продажа" : "Профиль";
		return <PlaceholderScreen title={tabTitle} text="Раздел будет подключен на следующем этапе." icon={Settings} />;
	}

	if (actor.permissions.includes("distributor.stock.read")) {
		if (actor.role === "courier") {
			return <CourierBalanceHome mode="own" />;
		}

		return <DistributorInventoryHome showCashBalance={actor.permissions.includes("distributor.cash.read")} />;
	}

	const roleConfig = roleHomeConfig[actor.role];

	return (
		<section className="screen-stack">
			<div className="summary-card">
				<div>
					<p className="summary-label">{roleConfig.summaryLabel}</p>
					<strong>{roleConfig.summaryValue}</strong>
				</div>
				<roleConfig.icon aria-hidden size={28} />
			</div>
			<div className="section-heading">
				<h2>Быстрые действия</h2>
			</div>
			<div className="action-grid">
				{roleConfig.actions.map((action) => (
					<button className="action-tile" type="button" key={action} disabled>
						<span>{action}</span>
					</button>
				))}
			</div>
		</section>
	);
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
			<div className="summary-card">
				<div>
					<p className="summary-label">{title}</p>
					<strong>{text}</strong>
				</div>
				<Icon aria-hidden size={28} />
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
			<div className="summary-card">
				<div>
					<p className="summary-label">Настройки</p>
					<strong>Профиль и сессия</strong>
				</div>
				<Settings aria-hidden size={28} />
			</div>

			<div className="form-panel">
				<div className="section-heading compact">
					<h2>{actor.displayName}</h2>
					<span>{ROLE_LABELS[actor.role]}</span>
				</div>
				<p className="muted">@{actor.login}</p>
				<button className="primary-button danger-button" disabled={logoutPending} onClick={logout} type="button">
					<LogOut aria-hidden size={18} />
					{logoutPending ? "Выходим" : "Выйти"}
				</button>
			</div>
		</section>
	);
}

function isProductionTab(tab: string): tab is "home" | "notifications" | "history" {
	return tab === "home" || tab === "notifications" || tab === "history";
}

const roleHomeConfig = {
	director: {
		summaryLabel: "Контроль дня",
		summaryValue: "Остатки, деньги, отчеты",
		icon: Shield,
		actions: ["Остатки", "Списать наличные", "Отчеты"],
	},
	production_manager: {
		summaryLabel: "Производство",
		summaryValue: "Сырье, тара, выпуск",
		icon: PackageCheck,
		actions: ["Сырье", "Тара", "Выпуск"],
	},
	commercial_manager: {
		summaryLabel: "Распределитель",
		summaryValue: "Клиенты, остатки, уведомления",
		icon: ReceiptText,
		actions: ["Клиенты", "Продажа", "Уведомить производство"],
	},
	distributor_worker: {
		summaryLabel: "Распределитель",
		summaryValue: "Остатки и продажи",
		icon: Box,
		actions: ["Остатки", "Продажа", "История"],
	},
	courier: {
		summaryLabel: "Баланс курьера",
		summaryValue: "Загрузка, продажи, сгрузка",
		icon: Truck,
		actions: ["Загрузка", "Продажа", "Сгрузка"],
	},
} satisfies Record<Exclude<Role, "admin">, {
	summaryLabel: string;
	summaryValue: string;
	icon: LucideIcon;
	actions: string[];
}>;
