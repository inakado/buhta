"use client";

import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Bell, Box, ClipboardList, LogOut, PackageCheck, ReceiptText, Settings, Shield, Truck, Users } from "lucide-react";
import { useState } from "react";
import type { Role } from "@buhta/shared";
import { LoginForm } from "../auth/LoginForm";
import { CatalogHome } from "../features/catalog/CatalogHome";
import { ClientsHome } from "../features/clients/ClientsHome";
import { DistributorInventoryHome } from "../features/distributor/DistributorInventoryHome";
import { ProductionHome } from "../features/production/ProductionHome";
import { AdminHome } from "../roles/admin/AdminHome";
import { ROLE_LABELS } from "../lib/role-labels";
import { getCurrentActor, isUnauthorizedError, signOut, type CurrentActor } from "../lib/api-client";
import { useOnlineStatus } from "./useOnlineStatus";

const signedOutState = { authenticated: false, actor: null };

function completeLocalSignOut(client: QueryClient) {
	void client.cancelQueries();
	client.setQueryData(["current-actor"], signedOutState);
	client.removeQueries({ queryKey: ["users"] });
}

function createAppQueryClient() {
	let client: QueryClient;
	const handleAuthError = (error: unknown) => {
		if (!isUnauthorizedError(error)) {
			return;
		}

		completeLocalSignOut(client);
	};

	client = new QueryClient({
		queryCache: new QueryCache({
			onError: handleAuthError,
		}),
		mutationCache: new MutationCache({
			onError: handleAuthError,
		}),
		defaultOptions: {
			queries: {
				retry: (failureCount, error) => !isUnauthorizedError(error) && failureCount < 2,
			},
		},
	});

	return client;
}

export function AppRoot() {
	const [client] = useState(createAppQueryClient);

	return (
		<QueryClientProvider client={client}>
			<AppContent />
		</QueryClientProvider>
	);
}

function AppContent() {
	const currentActor = useQuery({
		queryKey: ["current-actor"],
		queryFn: getCurrentActor,
		retry: false,
	});

	if (currentActor.isLoading) {
		return <LoadingScreen />;
	}

	if (!currentActor.data?.authenticated || !currentActor.data.actor) {
		return <LoginForm />;
	}

	return <AppShell actor={currentActor.data.actor} />;
}

function AppShell({ actor }: { actor: CurrentActor }) {
	const online = useOnlineStatus();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState(actor.role === "admin" ? "people" : "home");
	const logout = useMutation({
		mutationFn: signOut,
		onSettled: async () => {
			completeLocalSignOut(queryClient);
		},
	});
	function handleLogout() {
		completeLocalSignOut(queryClient);
		logout.mutate();
	}

	return (
		<main className="app-page">
			<div className="mobile-shell">
				<header className="header-bar">
					<div>
						<p className="eyebrow">{ROLE_LABELS[actor.role]}</p>
					</div>
				</header>

				{online ? null : (
					<div className="connection-status offline">
						<span />
						Нет сети: операции записи недоступны
					</div>
				)}

				<RoleHome
					actor={actor}
					activeTab={activeTab}
					logout={handleLogout}
					logoutPending={logout.isPending}
					online={online}
				/>
				<BottomNav activeTab={activeTab} onTabChange={setActiveTab} actor={actor} />
			</div>
		</main>
	);
}

function RoleHome({
	actor,
	activeTab,
	logout,
	logoutPending,
	online,
}: {
	actor: CurrentActor;
	activeTab: string;
	logout: () => void;
	logoutPending: boolean;
	online: boolean;
}) {
	if (activeTab === "settings") {
		return <SettingsScreen actor={actor} logout={logout} logoutPending={logoutPending} />;
	}

	if (activeTab === "catalog" && actor.permissions.includes("catalog.manage")) {
		return <CatalogHome online={online} />;
	}

	if (activeTab === "clients" && actor.permissions.includes("client.read")) {
		return <ClientsHome actor={actor} online={online} />;
	}

	if (actor.role === "production_manager") {
		if (activeTab === "distributor") {
			return <DistributorInventoryHome />;
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
		const tabTitle = activeTab === "sale" ? "Продажа" : "Профиль";
		return <PlaceholderScreen title={tabTitle} text="Раздел будет подключен на следующем этапе." icon={Settings} />;
	}

	if (actor.permissions.includes("distributor.stock.read")) {
		return <DistributorInventoryHome />;
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
	icon: typeof PackageCheck;
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

function BottomNav({
	activeTab,
	actor,
	onTabChange,
}: {
	activeTab: string;
	actor: CurrentActor;
	onTabChange: (tab: string) => void;
}) {
	const catalogItem = actor.permissions.includes("catalog.manage")
		? [{ id: "catalog", label: "Каталог", icon: ClipboardList }]
		: [];
	const clientsItem = actor.permissions.includes("client.read")
		? [{ id: "clients", label: "Клиенты", icon: Users }]
		: [];
	const productionItems = [
		{ id: "home", label: "Главная", icon: PackageCheck },
		{ id: "distributor", label: "Распределитель", icon: Box },
		{ id: "notifications", label: "Уведомления", icon: Bell },
		{ id: "history", label: "История", icon: ReceiptText },
		{ id: "settings", label: "Профиль", icon: Settings },
	];
	const items = actor.role === "admin"
		? [
			{ id: "people", label: "Люди", icon: Users },
			...catalogItem,
			...clientsItem,
			{ id: "audit", label: "Аудит", icon: Shield },
			{ id: "settings", label: "Настройки", icon: Settings },
		]
		: actor.role === "production_manager"
			? productionItems
		: [
			{ id: "home", label: "Главная", icon: PackageCheck },
			...catalogItem,
			...clientsItem,
			{ id: "sale", label: "Продажа", icon: ReceiptText },
			{ id: "settings", label: "Профиль", icon: Settings },
		];

	return (
		<nav className="bottom-nav" aria-label="Основная навигация">
			{items.map((item) => (
				<button
					aria-current={activeTab === item.id ? "page" : undefined}
					aria-label={item.label}
					className={activeTab === item.id ? "active" : ""}
					onClick={() => onTabChange(item.id)}
					type="button"
					key={item.id}
				>
					<item.icon aria-hidden className="bottom-nav-icon" size={20} />
				</button>
			))}
		</nav>
	);
}

function isProductionTab(tab: string): tab is "home" | "notifications" | "history" {
	return tab === "home" || tab === "notifications" || tab === "history";
}

function LoadingScreen() {
	return (
		<main className="app-page">
			<div className="mobile-shell centered-shell">
				<div className="loading-dot" />
				<p className="muted">Загрузка Бухты</p>
			</div>
		</main>
	);
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
	icon: typeof PackageCheck;
	actions: string[];
}>;
