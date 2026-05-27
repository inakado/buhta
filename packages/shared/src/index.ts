export const HEALTH_RESPONSE_SCHEMA_VERSION = 1;

export type Role =
	| "admin"
	| "director"
	| "production_manager"
	| "commercial_manager"
	| "distributor_worker"
	| "courier";

export const ROLES = [
	"admin",
	"director",
	"production_manager",
	"commercial_manager",
	"distributor_worker",
	"courier",
] as const satisfies readonly Role[];

export const HEALTH_RESPONSE_STATUS = "ok";
