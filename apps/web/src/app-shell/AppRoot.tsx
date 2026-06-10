"use client";

import Image from "next/image";
import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Bell, Box, Check, ClipboardList, Factory, Gauge, History, LayoutDashboard, MoreHorizontal, ReceiptText, Truck, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { getCurrentActor, isUnauthorizedError, listNotifications, signOut, type CurrentActor } from "../lib/api-client";
import { RoleHomeRouter } from "./RoleHomeRouter";
import { useOnlineStatus } from "./useOnlineStatus";

const signedOutState = { authenticated: false, actor: null };

type BottomNavItem = {
	id: string;
	label: string;
	icon: LucideIcon;
	badgeCount?: number;
};

const COURIER_NAV_ITEMS: BottomNavItem[] = [
	{ id: "home", label: "Баланс", icon: LayoutDashboard },
	{ id: "more", label: "Еще", icon: MoreHorizontal },
];

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
	const {
		data: currentActor,
		isLoading: currentActorLoading,
	} = useQuery({
		queryKey: ["current-actor"],
		queryFn: getCurrentActor,
		retry: false,
	});

	if (currentActorLoading) {
		return <LoadingScreen />;
	}

	if (!currentActor?.authenticated || !currentActor.actor) {
		return <LoginForm />;
	}

	return <AppShell actor={currentActor.actor} />;
}

function AppShell({ actor }: { actor: CurrentActor }) {
	const online = useOnlineStatus();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState(actor.role === "admin" ? "people" : "home");
	const [successNotice, setSuccessNotice] = useState<{ id: number; message: string } | null>(null);
	const successNoticeId = useRef(0);
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
	function showSuccessOnHome(message: string) {
		successNoticeId.current += 1;
		setActiveTab("home");
		setSuccessNotice({
			id: successNoticeId.current,
			message,
		});
	}

	useEffect(() => {
		if (!successNotice) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setSuccessNotice((current) => current?.id === successNotice.id ? null : current);
		}, 3000);

		return () => window.clearTimeout(timeoutId);
	}, [successNotice]);

	return (
		<main className="app-page">
			<div className="mobile-shell">
				{online ? null : (
					<div className="connection-status offline">
						<span />
						Нет сети: операции записи недоступны
					</div>
				)}

				<RoleHomeRouter
					actor={actor}
					activeTab={activeTab}
					logout={handleLogout}
					logoutPending={logout.isPending}
					online={online}
					onActionSuccess={showSuccessOnHome}
					onTabChange={setActiveTab}
				/>
				{successNotice ? (
					<output className="success-notice" aria-live="polite">
						<Check aria-hidden size={17} />
						{successNotice.message}
					</output>
				) : null}
				<BottomNav activeTab={activeTab} onTabChange={setActiveTab} actor={actor} />
			</div>
		</main>
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
	const shouldShowProductionNotifications = actor.role === "production_manager"
		&& actor.permissions.includes("notification.read");
	const { data: productionNotifications } = useQuery({
		queryKey: ["notifications", "all"],
		queryFn: () => listNotifications("all"),
		enabled: shouldShowProductionNotifications,
		refetchInterval: 30_000,
	});
	const newProductionNotifications = shouldShowProductionNotifications
		? productionNotifications?.summary.newCount ?? 0
		: 0;
	const catalogItem: BottomNavItem[] = actor.permissions.includes("catalog.manage")
		? [{ id: "catalog", label: "Каталог", icon: ClipboardList }]
		: [];
	const clientsItem: BottomNavItem[] = actor.permissions.includes("client.read")
		? [{ id: "clients", label: "Клиенты", icon: Users }]
		: [];
	const courierBalancesItem: BottomNavItem[] = actor.permissions.includes("courier.stock.read")
		&& (actor.role === "director" || actor.role === "commercial_manager")
		? [{ id: "couriers", label: "Курьеры", icon: Truck }]
		: [];
	const salesHistoryItem: BottomNavItem[] = actor.role === "distributor_worker"
		&& actor.permissions.includes("distributor.sale.create")
		? [{ id: "sales-history", label: "История", icon: History }]
		: [];
	const directorStockItem: BottomNavItem[] = actor.role === "director"
		&& (actor.permissions.includes("distributor.stock.read") || actor.permissions.includes("courier.stock.read"))
		? [{ id: "stock", label: "Остатки", icon: Box }]
		: [];
	const directorMoreItem: BottomNavItem[] = actor.role === "director"
		? [{ id: "more", label: "Еще", icon: MoreHorizontal }]
		: [];
	const commercialMoreItem: BottomNavItem[] = actor.role === "commercial_manager"
		? [{ id: "more", label: "Еще", icon: MoreHorizontal }]
		: [];
	const operationHistoryItem: BottomNavItem[] = actor.permissions.includes("operation.history.read")
		? [{ id: "operation-history", label: "История", icon: ReceiptText }]
		: [];
	const productionItems: BottomNavItem[] = [
		{ id: "home", label: "Главная", icon: Factory },
		{ id: "distributor", label: "Распределитель", icon: Box },
		{ id: "notifications", label: "Уведомления", icon: Bell, badgeCount: newProductionNotifications },
		{ id: "more", label: "Еще", icon: MoreHorizontal },
	];
	const items = actor.role === "admin"
		? [
			{ id: "people", label: "Люди", icon: Users },
			...catalogItem,
			...clientsItem,
			...courierBalancesItem,
			...operationHistoryItem,
			{ id: "more", label: "Еще", icon: MoreHorizontal },
		]
		: actor.role === "production_manager"
			? productionItems
			: actor.role === "courier"
				? COURIER_NAV_ITEMS
				: actor.role === "director"
					? [
			{ id: "home", label: "Главная", icon: Gauge },
			...directorStockItem,
			...operationHistoryItem,
			...directorMoreItem,
		]
					: actor.role === "commercial_manager"
						? [
			{ id: "home", label: "Главная", icon: Gauge },
			...catalogItem,
			...clientsItem,
			...courierBalancesItem,
			...commercialMoreItem,
		]
						: actor.role === "distributor_worker"
							? [
			{ id: "home", label: "Главная", icon: Gauge },
			...catalogItem,
			...clientsItem,
			...salesHistoryItem,
			{ id: "more", label: "Еще", icon: MoreHorizontal },
		]
							: [
			{ id: "home", label: "Главная", icon: Gauge },
			...catalogItem,
			...clientsItem,
			...courierBalancesItem,
			...salesHistoryItem,
			{ id: "more", label: "Еще", icon: MoreHorizontal },
		];

	return (
		<nav className="bottom-nav" aria-label="Основная навигация">
			{items.map((item) => {
				const isActive = activeTab === item.id || (
					actor.role === "director"
					&& item.id === "more"
					&& (activeTab === "catalog" || activeTab === "clients")
				) || (
					actor.role === "production_manager"
					&& item.id === "more"
					&& activeTab === "history"
				) || (
					actor.role === "commercial_manager"
					&& item.id === "more"
					&& activeTab === "sales-history"
				) || (
					actor.role === "courier"
					&& item.id === "more"
					&& activeTab === "sales-history"
				);

				return (
				<button
					aria-current={isActive ? "page" : undefined}
					aria-label={item.badgeCount ? `${item.label}, новых задач: ${item.badgeCount}` : item.label}
					className={isActive ? "active" : ""}
					onClick={() => onTabChange(item.id)}
					type="button"
					key={item.id}
				>
					<item.icon aria-hidden className="bottom-nav-icon" size={20} />
					{item.badgeCount ? (
						<span className="bottom-nav-badge" aria-hidden>
							{item.badgeCount > 9 ? "9+" : item.badgeCount}
						</span>
					) : null}
				</button>
			);
			})}
		</nav>
	);
}

function LoadingScreen() {
	return (
		<main className="app-page loading-page">
			<div className="mobile-shell centered-shell loading-shell">
				<Image className="loading-logo" src="/loader-pearl-cove.svg" alt="" aria-hidden width={96} height={96} priority />
			</div>
		</main>
	);
}
