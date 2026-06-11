"use client";

import type { CurrentActor } from "../../lib/api-client";
import { AdminUsersHome } from "../../features/users/AdminUsersHome";

export function AdminHome({
	actor,
	onActionSuccess,
	online,
}: {
	actor: CurrentActor;
	onActionSuccess: (message: string) => void;
	online: boolean;
}) {
	return <AdminUsersHome actor={actor} onActionSuccess={onActionSuccess} online={online} />;
}
