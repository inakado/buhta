"use client";

import { ClipboardList, LogOut, Users, type LucideIcon } from "lucide-react";
import { ROLE_LABELS } from "../../lib/role-labels";
import type { CurrentActor } from "../../lib/api-client";

type DirectorMoreHomeProps = {
	actor: CurrentActor;
	logout: () => void;
	logoutPending: boolean;
	onTabChange: (tab: string) => void;
};

export function DirectorMoreHome({
	actor,
	logout,
	logoutPending,
	onTabChange,
}: DirectorMoreHomeProps) {
	const rows: Array<{ id: string; label: string; detail: string; icon: LucideIcon }> = [];

	if (actor.permissions.includes("catalog.manage")) {
		rows.push({
			id: "catalog",
			label: "Каталог",
			detail: "Продукция, упаковка, распределители",
			icon: ClipboardList,
		});
	}

	if (actor.permissions.includes("client.read")) {
		rows.push({
			id: "clients",
			label: "Клиенты",
			detail: "База клиентов без операционного шума",
			icon: Users,
		});
	}

	return (
		<section className="screen-stack director-more-home">
			<div className="section-heading">
				<h2>Еще</h2>
				<span>{rows.length + 1}</span>
			</div>

			{rows.length > 0 ? (
				<div className="director-more-list">
					{rows.map((row) => (
						<button
							key={row.id}
							type="button"
							aria-label={row.label}
							className="director-more-row"
							onClick={() => onTabChange(row.id)}
						>
							<row.icon aria-hidden size={19} />
							<span>
								<strong>{row.label}</strong>
								<small>{row.detail}</small>
							</span>
						</button>
					))}
				</div>
			) : null}

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
