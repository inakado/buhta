"use client";

import {
	BookOpenText,
	ChevronRight,
	Download,
	Users,
	type LucideIcon,
} from "lucide-react";
import type { CurrentActor } from "../../lib/api-client";
import { AccountMoreSection } from "../../features/account/AccountMoreSection";

type DirectorMoreHomeProps = {
	actor: CurrentActor;
	logout: () => void;
	logoutPending: boolean;
	onActionSuccess: (message: string) => void;
	onTabChange: (tab: string) => void;
	online: boolean;
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

export function DirectorMoreHome({
	actor,
	logout,
	logoutPending,
	onActionSuccess,
	onTabChange,
	online,
}: DirectorMoreHomeProps) {
	const navigationRows: MenuRow[] = [];

	if (actor.permissions.includes("client.read")) {
		navigationRows.push({
			id: "clients",
			label: "Клиенты",
			detail: "База клиентов",
			icon: Users,
			onSelect: () => onTabChange("clients"),
		});
	}

	if (actor.permissions.includes("catalog.manage")) {
		navigationRows.push({
			id: "catalog",
			label: "Справочники",
			detail: "Продукция, тара, распределители",
			icon: BookOpenText,
			onSelect: () => onTabChange("catalog"),
		});
	}

	navigationRows.push({
		id: "export",
		label: "Экспорт",
		detail: "История, выгрузки, печать",
		disabled: true,
		icon: Download,
		trailing: "Позже",
	});

	return (
		<section className="screen-stack director-more-home">
			<h2 className="sr-only">Еще</h2>

			{navigationRows.length > 0 ? (
				<DirectorMoreSection label="Навигация" rows={navigationRows} />
			) : null}

			<AccountMoreSection
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onActionSuccess}
				online={online}
				sectionId="director-more"
			/>
		</section>
	);
}

function DirectorMoreSection({ label, rows }: { label: string; rows: MenuRow[] }) {
	return (
		<section className="director-more-section" aria-labelledby={`director-more-${label}`}>
			<h3 className="director-more-section-label" id={`director-more-${label}`}>{label}</h3>
			<div className="director-more-section-list">
				{rows.map((row) => (
					<DirectorMoreRow key={row.id} row={row} />
				))}
			</div>
		</section>
	);
}

function DirectorMoreRow({ row }: { row: MenuRow }) {
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
