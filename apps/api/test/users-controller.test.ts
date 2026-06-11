import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { AccountController } from "../src/users/account.controller";
import { UsersController } from "../src/users/users.controller";
import type { UsersService } from "../src/users/users.service";

const userSummary = {
	id: "u1",
	name: "Nikita",
	login: "director",
	role: "director" as const,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

const actor = {
	userId: "admin1",
	login: "admin",
	displayName: "Admin",
	role: "admin" as const,
	permissions: ["users.manage"] as const,
};

const requestUser = {
	id: actor.userId,
	email: "admin@internal.buhta.local",
	name: actor.displayName,
	username: actor.login,
	role: actor.role,
};

describe("UsersController", () => {
	it("validates create user payload before calling service", async () => {
		const usersService = {
			createUser: vi.fn(),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(controller.createUser(actor, { name: "", role: "owner" })).rejects.toThrow(AppError);
		expect(usersService.createUser).not.toHaveBeenCalled();
	});

	it("returns a temporary password after user creation", async () => {
		const usersService = {
			createUser: vi.fn().mockResolvedValue({
				user: userSummary,
				temporaryPassword: "Buh-test-test1!",
			}),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(
			controller.createUser(actor, {
				name: "Nikita",
				role: "director",
				login: "director",
			}),
		).resolves.toEqual({
			user: userSummary,
			temporaryPassword: "Buh-test-test1!",
		});
	});

	it("validates update role payload before calling service", async () => {
		const usersService = {
			updateUserRole: vi.fn(),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(controller.updateUserRole(actor, "u1", { role: "owner" })).rejects.toThrow(AppError);
		expect(usersService.updateUserRole).not.toHaveBeenCalled();
	});

	it("returns user summary after role update", async () => {
		const usersService = {
			updateUserRole: vi.fn().mockResolvedValue(userSummary),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(controller.updateUserRole(actor, "u1", { role: "director" })).resolves.toEqual({
			user: userSummary,
		});
		expect(usersService.updateUserRole).toHaveBeenCalledWith(actor, "u1", "director");
	});

	it("validates update identity payload before calling service", async () => {
		const usersService = {
			updateUserIdentity: vi.fn(),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(controller.updateUserIdentity(actor, "u1", { name: "", login: "bad login" })).rejects.toThrow(AppError);
		expect(usersService.updateUserIdentity).not.toHaveBeenCalled();
	});

	it("returns user summary after identity update", async () => {
		const updatedUser = {
			...userSummary,
			name: "Nikita Ivanov",
			login: "nikita",
		};
		const usersService = {
			updateUserIdentity: vi.fn().mockResolvedValue(updatedUser),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(controller.updateUserIdentity(actor, "u1", { name: "Nikita Ivanov", login: "Nikita" })).resolves.toEqual({
			user: updatedUser,
		});
		expect(usersService.updateUserIdentity).toHaveBeenCalledWith(actor, "u1", {
			name: "Nikita Ivanov",
			login: "nikita",
		});
	});

	it("validates own password change payload before calling service", async () => {
		const usersService = {
			changeOwnPassword: vi.fn(),
		} as unknown as UsersService;
		const policyRegistry = {
			buildActor: vi.fn().mockReturnValue(actor),
		};
		const controller = new AccountController(usersService, policyRegistry as never);

		await expect(
			controller.changeOwnPassword({ user: requestUser }, {
				currentPassword: "OldPass123!",
				newPassword: "short",
				newPasswordConfirmation: "short",
			}),
		).rejects.toThrow(AppError);
		expect(usersService.changeOwnPassword).not.toHaveBeenCalled();
	});

	it("changes own password for an authenticated actor", async () => {
		const usersService = {
			changeOwnPassword: vi.fn().mockResolvedValue({ user: userSummary }),
		} as unknown as UsersService;
		const policyRegistry = {
			buildActor: vi.fn().mockReturnValue(actor),
		};
		const controller = new AccountController(usersService, policyRegistry as never);
		const input = {
			currentPassword: "OldPass123!",
			newPassword: "NewPass123!",
			newPasswordConfirmation: "NewPass123!",
		};

		await expect(controller.changeOwnPassword({ user: requestUser }, input)).resolves.toEqual({
			user: userSummary,
		});
		expect(usersService.changeOwnPassword).toHaveBeenCalledWith(actor, input);
	});

	it("rejects own password change without authenticated user", async () => {
		const usersService = {
			changeOwnPassword: vi.fn(),
		} as unknown as UsersService;
		const policyRegistry = {
			buildActor: vi.fn(),
		};
		const controller = new AccountController(usersService, policyRegistry as never);

		await expect(
			controller.changeOwnPassword({}, {
				currentPassword: "OldPass123!",
				newPassword: "NewPass123!",
				newPasswordConfirmation: "NewPass123!",
			}),
		).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
		expect(usersService.changeOwnPassword).not.toHaveBeenCalled();
	});
});
