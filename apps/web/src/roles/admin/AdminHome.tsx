"use client";

import type { CurrentActor } from "../../lib/api-client";
import { AdminUsersHome } from "../../features/users/AdminUsersHome";

export function AdminHome({ actor }: { actor: CurrentActor }) {
	return <AdminUsersHome actor={actor} />;
}
