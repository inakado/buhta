import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
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
});
