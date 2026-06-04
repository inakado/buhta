import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { allRoles, type Permission } from "@buhta/shared";
import type { Actor, RequestWithActor } from "../src/policy/actor";
import { PolicyGuard } from "../src/policy/policy.guard";
import { PolicyRegistry } from "../src/policy/policy.registry";

function reflectorWithPermission(permission: Permission | undefined): Reflector {
	return {
		getAllAndOverride: <T>() => permission as T,
	} as unknown as Reflector;
}

function contextWithRequest(request: RequestWithActor): ExecutionContext {
	return {
		getHandler: () => function handler() {},
		getClass: () => class Controller {},
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	} as unknown as ExecutionContext;
}

describe("PolicyRegistry", () => {
	const registry = new PolicyRegistry();

	it("builds an application actor from an auth user", () => {
		const actor = registry.buildActor({
			id: "u1",
			username: "director",
			name: "Nikita",
			role: "director",
		});

		expect(actor).toMatchObject({
			userId: "u1",
			login: "director",
			displayName: "Nikita",
			role: "director",
		});
		expect(actor?.permissions).toContain("catalog.manage");
		expect(actor?.permissions).toContain("cash.withdraw");
		expect(actor?.permissions).not.toContain("users.manage");
	});

	it("gives production manager production access without catalog management", () => {
		const actor = registry.buildActor({
			id: "pm1",
			username: "production-manager",
			name: "Production Manager",
			role: "production_manager",
		});

		expect(actor?.permissions).toContain("production.manage");
		expect(actor?.permissions).not.toContain("catalog.manage");
	});

	it("allows every v1 role to read distributor stock", () => {
		for (const role of allRoles()) {
			const actor = registry.buildActor({
				id: `user-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("distributor.stock.read");
		}
	});

	it("keeps client read and manage permissions separated", () => {
		const director = registry.buildActor({
			id: "director",
			username: "director",
			name: "Director",
			role: "director",
		});
		const productionManager = registry.buildActor({
			id: "production-manager",
			username: "production-manager",
			name: "Production Manager",
			role: "production_manager",
		});

		expect(director?.permissions).toContain("client.read");
		expect(director?.permissions).not.toContain("client.manage");
		expect(productionManager?.permissions).not.toContain("client.read");
		expect(productionManager?.permissions).not.toContain("client.manage");

		for (const role of ["admin", "commercial_manager", "distributor_worker", "courier"] as const) {
			const actor = registry.buildActor({
				id: `user-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("client.read");
			expect(actor?.permissions).toContain("client.manage");
		}
	});

	it("keeps distributor sale and cash permissions separated", () => {
		for (const role of ["admin", "commercial_manager", "distributor_worker"] as const) {
			const actor = registry.buildActor({
				id: `sale-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("distributor.sale.create");
		}

		for (const role of ["director", "production_manager", "courier"] as const) {
			const actor = registry.buildActor({
				id: `no-sale-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("distributor.sale.create");
		}

		for (const role of ["admin", "director", "commercial_manager", "distributor_worker"] as const) {
			const actor = registry.buildActor({
				id: `cash-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("distributor.cash.read");
		}

		for (const role of ["production_manager", "courier"] as const) {
			const actor = registry.buildActor({
				id: `no-cash-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("distributor.cash.read");
		}
	});

	it("rejects missing identity fields and unknown roles", () => {
		expect(registry.buildActor({ username: "no-id", role: "director" })).toBeNull();
		expect(registry.buildActor({ id: "u1", username: "x", role: "owner" })).toBeNull();
	});

	it("keeps courier stock read and load permissions separated", () => {
		for (const role of ["admin", "director", "commercial_manager", "courier"] as const) {
			const actor = registry.buildActor({
				id: `courier-read-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("courier.stock.read");
		}

		for (const role of ["admin", "courier"] as const) {
			const actor = registry.buildActor({
				id: `courier-load-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("courier.stock.load");
		}

		for (const role of ["director", "commercial_manager", "production_manager", "distributor_worker"] as const) {
			const actor = registry.buildActor({
				id: `no-courier-load-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("courier.stock.load");
		}

		for (const role of ["production_manager", "distributor_worker"] as const) {
			const actor = registry.buildActor({
				id: `no-courier-read-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("courier.stock.read");
		}
	});

	it("keeps courier cash read and sale write permissions separated", () => {
		for (const role of ["admin", "director", "commercial_manager", "courier"] as const) {
			const actor = registry.buildActor({
				id: `courier-cash-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("courier.cash.read");
		}

		for (const role of ["admin", "courier"] as const) {
			const actor = registry.buildActor({
				id: `courier-sale-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("courier.sale.create");
			expect(actor?.permissions).toContain("courier.unload.create");
		}

		for (const role of ["director", "commercial_manager", "production_manager", "distributor_worker"] as const) {
			const actor = registry.buildActor({
				id: `no-courier-sale-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("courier.sale.create");
			expect(actor?.permissions).not.toContain("courier.unload.create");
		}

		for (const role of ["production_manager", "distributor_worker"] as const) {
			const actor = registry.buildActor({
				id: `no-courier-cash-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("courier.cash.read");
		}
	});

	it("keeps production notification permissions explicit", () => {
		for (const role of ["admin", "director", "production_manager", "commercial_manager"] as const) {
			const actor = registry.buildActor({
				id: `notification-read-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("notification.read");
		}

		for (const role of ["distributor_worker", "courier"] as const) {
			const actor = registry.buildActor({
				id: `no-notification-read-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("notification.read");
		}

		for (const role of ["admin", "commercial_manager"] as const) {
			const actor = registry.buildActor({
				id: `notification-create-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("notification.create");
		}

		for (const role of ["director", "production_manager", "distributor_worker", "courier"] as const) {
			const actor = registry.buildActor({
				id: `no-notification-create-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("notification.create");
		}

		for (const role of ["admin", "production_manager"] as const) {
			const actor = registry.buildActor({
				id: `notification-complete-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("notification.complete");
		}

		for (const role of ["director", "commercial_manager", "distributor_worker", "courier"] as const) {
			const actor = registry.buildActor({
				id: `no-notification-complete-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).not.toContain("notification.complete");
		}
	});
});

describe("PolicyGuard", () => {
	const registry = new PolicyRegistry();

	it("allows users with the required permission and stores actor on request", () => {
		const request: RequestWithActor = {
			user: {
				id: "u1",
				username: "director",
				name: "Nikita",
				role: "director",
			},
		};
		const guard = new PolicyGuard(reflectorWithPermission("cash.withdraw"), registry);

		expect(guard.canActivate(contextWithRequest(request))).toBe(true);
		expect(request.actor?.role).toBe("director");
	});

	it("rejects anonymous and wrong-role users", () => {
		const anonymousGuard = new PolicyGuard(reflectorWithPermission("cash.withdraw"), registry);
		expect(() => anonymousGuard.canActivate(contextWithRequest({}))).toThrow(UnauthorizedException);

		const courierGuard = new PolicyGuard(reflectorWithPermission("cash.withdraw"), registry);
		expect(() =>
			courierGuard.canActivate(
				contextWithRequest({
					user: {
						id: "u2",
						username: "courier",
						name: "Courier",
						role: "courier",
					},
				}),
			),
		).toThrow(ForbiddenException);
	});

	it("rejects distributor stock reads when an artificial actor lacks permission", () => {
		const limitedRegistry = {
			buildActor: () => ({
				userId: "limited-user",
				login: "limited-user",
				displayName: "Limited User",
				role: "courier",
				permissions: [],
			}),
			hasPermission: (actor: Actor, permission: Permission) => actor.permissions.includes(permission),
			permissionsForRole: () => [],
		} as PolicyRegistry;
		const guard = new PolicyGuard(reflectorWithPermission("distributor.stock.read"), limitedRegistry);

		expect(() =>
			guard.canActivate(
				contextWithRequest({
					user: {
						id: "limited-user",
						username: "limited-user",
						name: "Limited User",
						role: "courier",
					},
				}),
			),
		).toThrow(ForbiddenException);
	});

	it("rejects client API permissions for wrong roles", () => {
		const directorRequest: RequestWithActor = {
			user: {
				id: "director",
				username: "director",
				name: "Director",
				role: "director",
			},
		};
		const directorWriteGuard = new PolicyGuard(reflectorWithPermission("client.manage"), registry);
		expect(() => directorWriteGuard.canActivate(contextWithRequest(directorRequest))).toThrow(ForbiddenException);

		const productionManagerRequest: RequestWithActor = {
			user: {
				id: "pm",
				username: "pm",
				name: "Production Manager",
				role: "production_manager",
			},
		};
		const productionReadGuard = new PolicyGuard(reflectorWithPermission("client.read"), registry);
		expect(() => productionReadGuard.canActivate(contextWithRequest(productionManagerRequest))).toThrow(
			ForbiddenException,
		);
	});

	it("rejects distributor sale and cash permissions for wrong roles", () => {
		const productionManagerRequest: RequestWithActor = {
			user: {
				id: "pm",
				username: "pm",
				name: "Production Manager",
				role: "production_manager",
			},
		};
		const courierRequest: RequestWithActor = {
			user: {
				id: "courier",
				username: "courier",
				name: "Courier",
				role: "courier",
			},
		};
		const directorRequest: RequestWithActor = {
			user: {
				id: "director",
				username: "director",
				name: "Director",
				role: "director",
			},
		};

		expect(() =>
			new PolicyGuard(reflectorWithPermission("distributor.sale.create"), registry)
				.canActivate(contextWithRequest(productionManagerRequest)),
		).toThrow(ForbiddenException);
		expect(() =>
			new PolicyGuard(reflectorWithPermission("distributor.cash.read"), registry)
				.canActivate(contextWithRequest(courierRequest)),
		).toThrow(ForbiddenException);
		expect(() =>
			new PolicyGuard(reflectorWithPermission("distributor.sale.create"), registry)
				.canActivate(contextWithRequest(directorRequest)),
		).toThrow(ForbiddenException);
	});
});
