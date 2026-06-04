import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
	CompleteNotificationRequestSchema,
	CreateNotificationRequestSchema,
	NotificationsListQuerySchema,
} from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(PolicyGuard)
export class NotificationsController {
	constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

	@Get()
	@RequirePermission("notification.read")
	async listNotifications(@CurrentActor() actor: Actor | undefined, @Query() query: unknown) {
		return this.notificationsService.listNotifications(
			requireActor(actor),
			parseInput(NotificationsListQuerySchema, query, "Invalid notifications query"),
		);
	}

	@Post()
	@RequirePermission("notification.create")
	async createNotification(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return {
			notification: await this.notificationsService.createNotification(
				requireActor(actor),
				parseInput(CreateNotificationRequestSchema, body, "Invalid notification payload"),
			),
		};
	}

	@Patch(":notificationId/complete")
	@RequirePermission("notification.complete")
	async completeNotification(
		@CurrentActor() actor: Actor | undefined,
		@Param("notificationId") notificationId: string,
		@Body() body: unknown,
	) {
		parseInput(CompleteNotificationRequestSchema, body, "Invalid notification completion payload");

		return {
			notification: await this.notificationsService.completeNotification(requireActor(actor), notificationId),
		};
	}
}

function requireActor(actor: Actor | undefined): Actor {
	if (!actor) {
		throw new AppError("UNAUTHENTICATED", "Authentication is required");
	}

	return actor;
}

function parseInput<T extends z.ZodType>(schema: T, value: unknown, message: string): z.infer<T> {
	const parsed = schema.safeParse(value);

	if (!parsed.success) {
		throw new AppError("VALIDATION_ERROR", message, parsed.error.flatten());
	}

	return parsed.data;
}
