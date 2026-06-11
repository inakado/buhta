"use client";

import {
	ChevronRight,
	ReceiptText,
	type LucideIcon,
} from "lucide-react";
import type { CurrentActor } from "../../lib/api-client";
import { AccountMoreSection } from "../../features/account/AccountMoreSection";

type CourierMoreHomeProps = {
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

export function CourierMoreHome({
	actor,
	logout,
	logoutPending,
	onActionSuccess,
	onTabChange,
	online,
}: CourierMoreHomeProps) {
	const navigationRows: MenuRow[] = [
		{
			id: "sales-history",
			label: "История",
			detail: "Последние продажи",
			icon: ReceiptText,
			onSelect: () => onTabChange("sales-history"),
		},
	];
	return (
		<section className="screen-stack director-more-home">
			<h2 className="sr-only">Еще</h2>

			<CourierMoreSection label="Навигация" rows={navigationRows} />

			<AccountMoreSection
				actor={actor}
				logout={logout}
				logoutPending={logoutPending}
				onActionSuccess={onActionSuccess}
				online={online}
				sectionId="courier-more"
			/>
		</section>
	);
}

function CourierMoreSection({ label, rows }: { label: string; rows: MenuRow[] }) {
	return (
		<section className="director-more-section" aria-labelledby={`courier-more-${label}`}>
			<h3 className="director-more-section-label" id={`courier-more-${label}`}>{label}</h3>
			<div className="director-more-section-list">
				{rows.map((row) => (
					<CourierMoreRow key={row.id} row={row} />
				))}
			</div>
		</section>
	);
}

function CourierMoreRow({ row }: { row: MenuRow }) {
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
			{row.trailing ? (
				<span className="director-more-menu-status">{row.trailing}</span>
			) : (
				<ChevronRight aria-hidden className="director-more-menu-chevron" size={17} />
			)}
		</button>
	);
}
