import { ROLES, type Role } from "./roles";

export const PERMISSIONS = [
	"users.manage",
	"catalog.manage",
	"production.manage",
	"distributor.stock.read",
	"distributor.cash.read",
	"client.read",
	"client.manage",
	"distributor.sale.create",
	"courier.stock.load",
	"courier.sale.create",
	"courier.unload.create",
	"notification.create",
	"notification.complete",
	"cash.withdraw",
	"discount.assign",
	"operation.correct",
	"audit.read",
	"reports.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS = {
	admin: PERMISSIONS,
	director: [
		"catalog.manage",
		"distributor.stock.read",
		"distributor.cash.read",
		"client.read",
		"cash.withdraw",
		"discount.assign",
		"operation.correct",
		"audit.read",
		"reports.read",
	],
	production_manager: [
		"production.manage",
		"distributor.stock.read",
		"notification.complete",
		"audit.read",
	],
	commercial_manager: [
		"distributor.stock.read",
		"distributor.cash.read",
		"client.read",
		"client.manage",
		"distributor.sale.create",
		"notification.create",
		"audit.read",
		"reports.read",
	],
	distributor_worker: [
		"distributor.stock.read",
		"distributor.cash.read",
		"client.read",
		"client.manage",
		"distributor.sale.create",
		"audit.read",
	],
	courier: [
		"distributor.stock.read",
		"client.read",
		"client.manage",
		"courier.stock.load",
		"courier.sale.create",
		"courier.unload.create",
	],
} as const satisfies Record<Role, readonly Permission[]>;

export function permissionsForRole(role: Role): readonly Permission[] {
	return ROLE_PERMISSIONS[role];
}

export function isPermission(value: string | null | undefined): value is Permission {
	return PERMISSIONS.includes(value as Permission);
}

export function allRoles(): readonly Role[] {
	return ROLES;
}
