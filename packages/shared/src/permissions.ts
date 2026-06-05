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
	"distributor.sale.cancel",
	"courier.stock.read",
	"courier.stock.load",
	"courier.cash.read",
	"courier.sale.create",
	"courier.sale.cancel",
	"courier.unload.create",
	"notification.read",
	"notification.create",
	"notification.complete",
	"cash.withdraw",
	"discount.assign",
	"operation.correct",
	"operation.history.read",
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
		"courier.stock.read",
		"courier.cash.read",
		"client.read",
		"notification.read",
		"cash.withdraw",
		"discount.assign",
		"operation.correct",
		"operation.history.read",
		"audit.read",
		"reports.read",
	],
	production_manager: [
		"production.manage",
		"distributor.stock.read",
		"notification.read",
		"notification.complete",
		"audit.read",
	],
	commercial_manager: [
		"distributor.stock.read",
		"distributor.cash.read",
		"courier.stock.read",
		"courier.cash.read",
		"client.read",
		"client.manage",
		"distributor.sale.create",
		"distributor.sale.cancel",
		"notification.read",
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
		"distributor.sale.cancel",
		"audit.read",
	],
	courier: [
		"distributor.stock.read",
		"courier.stock.read",
		"courier.cash.read",
		"client.read",
		"client.manage",
		"courier.stock.load",
		"courier.sale.create",
		"courier.sale.cancel",
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
