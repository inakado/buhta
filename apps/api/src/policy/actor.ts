import type { Permission, Role } from "@buhta/shared";

export type Actor = {
	userId: string;
	email: string;
	displayName: string;
	role: Role;
	permissions: readonly Permission[];
};

export type RequestUser = {
	id?: string;
	email?: string;
	name?: string | null;
	role?: string | null;
};

export type RequestWithActor = {
	user?: RequestUser;
	actor?: Actor;
};
