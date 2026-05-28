import { Injectable } from "@nestjs/common";
import {
	isRole,
	permissionsForRole,
	type Permission,
	type Role,
} from "@buhta/shared";
import type { Actor, RequestUser } from "./actor";

@Injectable()
export class PolicyRegistry {
	buildActor(user: RequestUser): Actor | null {
		if (!user.id || !isRole(user.role)) {
			return null;
		}

		const login = user.username ?? user.email ?? user.id;

		return {
			userId: user.id,
			login,
			displayName: user.name ?? user.displayUsername ?? login,
			role: user.role,
			permissions: permissionsForRole(user.role),
		};
	}

	hasPermission(actor: Actor, permission: Permission): boolean {
		return actor.permissions.includes(permission);
	}

	permissionsForRole(role: Role): readonly Permission[] {
		return permissionsForRole(role);
	}
}
