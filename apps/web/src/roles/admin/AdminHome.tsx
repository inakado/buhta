"use client";

import type { CurrentActor } from "../../lib/api-client";
import { AdminUsersHome } from "../../features/users/AdminUsersHome";

export function AdminHome({ actor, online }: { actor: CurrentActor; online: boolean }) {
	return <AdminUsersHome actor={actor} online={online} />;
}
