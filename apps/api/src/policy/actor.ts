import type { Permission, Role } from "@buhta/shared";

export type Actor = {
	userId: string;
	login: string;
	displayName: string;
	role: Role;
	permissions: readonly Permission[];
};

export type RequestUser = {
	id?: string;
	email?: string;
	name?: string | null;
	username?: string | null;
	displayUsername?: string | null;
	role?: string | null;
};

export type RequestWithActor = {
	user?: RequestUser;
	actor?: Actor;
};
