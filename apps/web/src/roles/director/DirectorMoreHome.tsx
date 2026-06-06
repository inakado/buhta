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
			<h2 className="sr-only">Еще</h2>

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

			<div
				className="director-account-panel"
				style={{
					alignItems: "center",
					background: "var(--surface-muted)",
					borderRadius: 12,
					columnGap: 12,
					display: "grid",
					gridTemplateColumns: "minmax(0, 1fr) auto",
					marginTop: 20,
					padding: "10px 10px 10px 12px",
				}}
			>
				<div
					className="director-account-head"
					style={{ minWidth: 0 }}
				>
					<strong
						style={{
							color: "var(--base-black)",
							display: "block",
							fontSize: 14,
							fontWeight: "var(--font-weight-emphasis)",
							lineHeight: 1.15,
							overflowWrap: "anywhere",
						}}
					>
						{actor.displayName}
					</strong>
					<span
						style={{
							color: "var(--text-muted)",
							display: "block",
							fontSize: 11,
							lineHeight: 1.2,
							marginTop: 3,
							overflowWrap: "anywhere",
						}}
					>
						{ROLE_LABELS[actor.role]} · @{actor.login}
					</span>
				</div>
				<button
					className="director-logout-button"
					aria-label="Выйти из профиля"
					disabled={logoutPending}
					onClick={logout}
					style={{
						alignItems: "center",
						background: "transparent",
						border: 0,
						color: "var(--text-muted)",
						cursor: logoutPending ? "not-allowed" : "pointer",
						display: "inline-flex",
						font: "inherit",
						fontSize: 13,
						fontWeight: "var(--font-weight-label)",
						gap: 6,
						justifyContent: "flex-end",
						minHeight: 44,
						opacity: logoutPending ? 0.55 : 1,
						padding: "0 4px",
						whiteSpace: "nowrap",
						width: "fit-content",
					}}
					type="button"
				>
					<LogOut aria-hidden size={15} />
					{logoutPending ? "Выходим" : "Выйти"}
				</button>
			</div>
		</section>
	);
}
