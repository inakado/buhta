import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { NotificationsController } from "../src/notifications/notifications.controller";
import type { NotificationsService } from "../src/notifications/notifications.service";
import type { Actor } from "../src/policy/actor";

const commercialActor: Actor = {
	userId: "commercial1",
	login: "commercial",
	displayName: "Commercial",
	role: "commercial_manager",
	permissions: ["notification.read", "notification.create"],
};

const productionActor: Actor = {
	userId: "production1",
	login: "production",
	displayName: "Production",
	role: "production_manager",
	permissions: ["notification.read", "notification.complete"],
};

const notification = {
	id: "notification1",
	message: "Сделать партию икры",
	status: "new" as const,
	createdBy: {
		userId: commercialActor.userId,
		login: commercialActor.login,
		displayName: commercialActor.displayName,
	},
	completedBy: null,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
	completedAt: null,
};

describe("NotificationsController", () => {
	it("lists notifications and parses query", async () => {
		const notificationsService = {
			listNotifications: vi.fn().mockResolvedValue({
				items: [notification],
				summary: { newCount: 1, completedCount: 0 },
			}),
		} as unknown as NotificationsService;
		const controller = new NotificationsController(notificationsService);

		await expect(controller.listNotifications(commercialActor, { status: "new" })).resolves.toEqual({
			items: [notification],
			summary: { newCount: 1, completedCount: 0 },
		});
		expect(notificationsService.listNotifications).toHaveBeenCalledWith(commercialActor, { status: "new" });
		await expect(controller.listNotifications(commercialActor, { status: "archived" })).rejects.toThrow(AppError);
		await expect(controller.listNotifications(undefined, {})).rejects.toThrow(AppError);
	});

	it("validates create payload before calling service", async () => {
		const notificationsService = {
			createNotification: vi.fn(),
		} as unknown as NotificationsService;
		const controller = new NotificationsController(notificationsService);

		await expect(controller.createNotification(commercialActor, { message: "" })).rejects.toThrow(AppError);
		expect(notificationsService.createNotification).not.toHaveBeenCalled();
	});

	it("creates notification with actor from request", async () => {
		const notificationsService = {
			createNotification: vi.fn().mockResolvedValue(notification),
		} as unknown as NotificationsService;
		const controller = new NotificationsController(notificationsService);

		await expect(
			controller.createNotification(commercialActor, { message: " Сделать партию икры " }),
		).resolves.toEqual({ notification });
		expect(notificationsService.createNotification).toHaveBeenCalledWith(commercialActor, {
			message: "Сделать партию икры",
		});
	});

	it("requires actor for create and complete", async () => {
		const notificationsService = {
			createNotification: vi.fn(),
			completeNotification: vi.fn(),
		} as unknown as NotificationsService;
		const controller = new NotificationsController(notificationsService);

		await expect(controller.createNotification(undefined, { message: "x" })).rejects.toThrow(AppError);
		await expect(controller.completeNotification(undefined, "notification1", {})).rejects.toThrow(AppError);
		expect(notificationsService.createNotification).not.toHaveBeenCalled();
		expect(notificationsService.completeNotification).not.toHaveBeenCalled();
	});

	it("validates complete payload and completes notification", async () => {
		const completedNotification = {
			...notification,
			status: "completed" as const,
			completedBy: {
				userId: productionActor.userId,
				login: productionActor.login,
				displayName: productionActor.displayName,
			},
			completedAt: new Date(1).toISOString(),
		};
		const notificationsService = {
			completeNotification: vi.fn().mockResolvedValue(completedNotification),
		} as unknown as NotificationsService;
		const controller = new NotificationsController(notificationsService);

		await expect(
			controller.completeNotification(productionActor, "notification1", { comment: "done" }),
		).rejects.toThrow(AppError);
		expect(notificationsService.completeNotification).not.toHaveBeenCalled();

		await expect(controller.completeNotification(productionActor, "notification1", {})).resolves.toEqual({
			notification: completedNotification,
		});
		expect(notificationsService.completeNotification).toHaveBeenCalledWith(productionActor, "notification1");
	});
});
