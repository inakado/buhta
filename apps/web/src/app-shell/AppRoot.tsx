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
import { Bell, Box, Check, ClipboardList, PackageCheck, ReceiptText, Settings, Shield, Truck, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { ROLE_LABELS } from "../lib/role-labels";
import { getCurrentActor, isUnauthorizedError, signOut, type CurrentActor } from "../lib/api-client";
import { RoleHomeRouter } from "./RoleHomeRouter";
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
					<div className="success-notice" role="status" aria-live="polite">
						<Check aria-hidden size={17} />
						{successNotice.message}
					</div>
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
	const catalogItem = actor.permissions.includes("catalog.manage")
		? [{ id: "catalog", label: "Каталог", icon: ClipboardList }]
		: [];
	const clientsItem = actor.permissions.includes("client.read")
		? [{ id: "clients", label: "Клиенты", icon: Users }]
		: [];
	const courierBalancesItem = actor.permissions.includes("courier.stock.read")
		&& (actor.role === "director" || actor.role === "commercial_manager")
		? [{ id: "couriers", label: "Курьеры", icon: Truck }]
		: [];
	const courierItems = [
		{ id: "home", label: "Баланс", icon: PackageCheck },
		{ id: "load", label: "Загрузка", icon: Truck },
		{ id: "sale", label: "Продажа", icon: ReceiptText },
		{ id: "settings", label: "Профиль", icon: Settings },
	];
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
			...courierBalancesItem,
			{ id: "audit", label: "Аудит", icon: Shield },
			{ id: "settings", label: "Настройки", icon: Settings },
		]
		: actor.role === "production_manager"
			? productionItems
			: actor.role === "courier"
				? courierItems
				: actor.role === "director"
					? [
			{ id: "home", label: "Главная", icon: PackageCheck },
			...clientsItem,
			...courierBalancesItem,
			{ id: "settings", label: "Профиль", icon: Settings },
		]
				: [
			{ id: "home", label: "Главная", icon: PackageCheck },
			...catalogItem,
			...clientsItem,
			...courierBalancesItem,
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
