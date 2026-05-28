import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { UsersController } from "../src/users/users.controller";
import type { UsersService } from "../src/users/users.service";

const userSummary = {
	id: "u1",
	name: "Nikita",
	email: "director@buhta.local",
	role: "director" as const,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

describe("UsersController", () => {
	it("validates update role payload before calling service", async () => {
		const usersService = {
			updateUserRole: vi.fn(),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(controller.updateUserRole("u1", { role: "owner" })).rejects.toThrow(AppError);
		expect(usersService.updateUserRole).not.toHaveBeenCalled();
	});

	it("returns user summary after role update", async () => {
		const usersService = {
			updateUserRole: vi.fn().mockResolvedValue(userSummary),
		} as unknown as UsersService;
		const controller = new UsersController(usersService);

		await expect(controller.updateUserRole("u1", { role: "director" })).resolves.toEqual({
			user: userSummary,
		});
		expect(usersService.updateUserRole).toHaveBeenCalledWith("u1", "director");
	});
});
