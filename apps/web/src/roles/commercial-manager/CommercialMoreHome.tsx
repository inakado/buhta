"use client";

import {
	ChevronRight,
	KeyRound,
	LogOut,
	ReceiptText,
	type LucideIcon,
} from "lucide-react";
import { ROLE_LABELS } from "../../lib/role-labels";
import type { CurrentActor } from "../../lib/api-client";

type CommercialMoreHomeProps = {
	actor: CurrentActor;
	logout: () => void;
	logoutPending: boolean;
	onTabChange: (tab: string) => void;
};

type MenuRow = {
	detail: string;
	disabled?: boolean;
	icon: LucideIcon;
	id: string;
	label: string;
	onSelect?: () => void;
	tone?: "default" | "danger";
	trailing?: string;
};

export function CommercialMoreHome({
	actor,
	logout,
	logoutPending,
	onTabChange,
}: CommercialMoreHomeProps) {
	const navigationRows: MenuRow[] = [
		{
			id: "sales-history",
			label: "История",
			detail: "Последние продажи",
			icon: ReceiptText,
			onSelect: () => onTabChange("sales-history"),
		},
	];
	const accountRows: MenuRow[] = [
		{
			id: "change-password",
			label: "Сменить пароль",
			detail: "Безопасность входа",
			disabled: true,
			icon: KeyRound,
			trailing: "Позже",
		},
		{
			id: "logout",
			label: logoutPending ? "Выходим" : "Выйти",
			detail: "Завершить текущую сессию",
			disabled: logoutPending,
			icon: LogOut,
			onSelect: logout,
			tone: "danger",
		},
	];

	return (
		<section className="screen-stack director-more-home">
			<h2 className="sr-only">Еще</h2>

			<CommercialMoreSection label="Навигация" rows={navigationRows} />

			<section className="director-more-section" aria-labelledby="commercial-more-account">
				<h3 className="director-more-section-label" id="commercial-more-account">Аккаунт</h3>
				<div className="director-more-account-identity">
					<strong>{actor.displayName}</strong>
					<span>
						{ROLE_LABELS[actor.role]} · @{actor.login}
					</span>
				</div>
				<div className="director-more-section-list">
					{accountRows.map((row) => (
						<CommercialMoreRow key={row.id} row={row} />
					))}
				</div>
			</section>
		</section>
	);
}

function CommercialMoreSection({ label, rows }: { label: string; rows: MenuRow[] }) {
	return (
		<section className="director-more-section" aria-labelledby={`commercial-more-${label}`}>
			<h3 className="director-more-section-label" id={`commercial-more-${label}`}>{label}</h3>
			<div className="director-more-section-list">
				{rows.map((row) => (
					<CommercialMoreRow key={row.id} row={row} />
				))}
			</div>
		</section>
	);
}

function CommercialMoreRow({ row }: { row: MenuRow }) {
	const Icon = row.icon;

	return (
		<button
			type="button"
			aria-label={row.label}
			className={row.tone === "danger" ? "director-more-menu-row danger" : "director-more-menu-row"}
			disabled={row.disabled}
			onClick={row.onSelect}
		>
			<span className="director-more-menu-icon">
				<Icon aria-hidden size={17} />
			</span>
			<span className="director-more-menu-copy">
				<strong>{row.label}</strong>
				<small>{row.detail}</small>
			</span>
			{row.trailing ? <span className="director-more-menu-status">{row.trailing}</span> : <ChevronRight aria-hidden className="director-more-menu-chevron" size={17} />}
		</button>
	);
}
