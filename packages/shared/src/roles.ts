export const ROLES = [
	"admin",
	"director",
	"production_manager",
	"commercial_manager",
	"distributor_worker",
	"courier",
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string | null | undefined): value is Role {
	return ROLES.includes(value as Role);
}
