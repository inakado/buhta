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
		if (!user.id || !user.email || !isRole(user.role)) {
			return null;
		}

		return {
			userId: user.id,
			email: user.email,
			displayName: user.name ?? user.email,
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
