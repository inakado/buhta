import { Injectable } from "@nestjs/common";
import type {
	CreateNotificationRequest,
	Notification,
	NotificationsListQuery,
	NotificationsListResponse,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import { mapNotification } from "./notifications.mapper";

const NOTIFICATION_INCLUDE = {
	createdBy: true,
	completedBy: true,
} satisfies Prisma.ProductionNotificationInclude;

@Injectable()
export class NotificationsService {
	async listNotifications(actor: Actor, query: NotificationsListQuery): Promise<NotificationsListResponse> {
		if (!canReadNotifications(actor.role)) {
			throw new AppError("FORBIDDEN", "Production notifications are not available for this role");
		}

		const where = buildStatusWhere(query.status ?? "all");
		const [items, newCount, completedCount] = await Promise.all([
			prisma.productionNotification.findMany({
				where,
				include: NOTIFICATION_INCLUDE,
				orderBy: [
					{ status: "desc" },
					{ createdAt: "desc" },
				],
			}),
			prisma.productionNotification.count({ where: { status: "new" } }),
			prisma.productionNotification.count({ where: { status: "completed" } }),
		]);

		return {
			items: items.map(mapNotification),
			summary: {
				newCount,
				completedCount,
			},
		};
	}

	async createNotification(actor: Actor, input: CreateNotificationRequest): Promise<Notification> {
		if (!canCreateNotification(actor.role)) {
			throw new AppError("FORBIDDEN", "Only commercial manager can create production notifications");
		}
		const message = input.message.trim();
		if (!message || message.length > 1000) {
			throw new AppError("VALIDATION_ERROR", "Notification message must be 1-1000 characters");
		}

		const record = await prisma.$transaction(async (tx) => {
			const operation = await tx.operation.create({
				data: {
					type: "production.notification.create",
					status: OPERATION_STATUS.succeeded,
					actorUserId: actor.userId,
					metadata: {
						message,
						recipientRole: "production_manager",
					},
				},
			});

			const notification = await tx.productionNotification.create({
				data: {
					message,
					status: "new",
					createdByUserId: actor.userId,
					createOperationId: operation.id,
				},
				include: NOTIFICATION_INCLUDE,
			});

			await tx.auditLog.create({
				data: {
					operationId: operation.id,
					actorUserId: actor.userId,
					action: "production.notification.create",
					entityType: "production_notification",
					entityId: notification.id,
					details: {
						notificationId: notification.id,
						message: notification.message,
						createdByUserId: notification.createdByUserId,
						recipientRole: "production_manager",
						statusAfter: notification.status,
					},
				},
			});

			return notification;
		});

		return mapNotification(record);
	}

	async completeNotification(actor: Actor, notificationId: string): Promise<Notification> {
		if (!canCompleteNotification(actor.role)) {
			throw new AppError("FORBIDDEN", "Only production manager can complete production notifications");
		}

		if (!notificationId) {
			throw new AppError("VALIDATION_ERROR", "Notification id is required");
		}

		try {
			const record = await prisma.$transaction(async (tx) => {
				const notification = await tx.productionNotification.findUnique({
					where: { id: notificationId },
					include: NOTIFICATION_INCLUDE,
				});

				if (!notification) {
					throw new AppError("NOT_FOUND", "Notification not found");
				}

				if (notification.status !== "new") {
					throw new AppError("DOMAIN_RULE_VIOLATION", "Notification is already completed");
				}

				const operation = await tx.operation.create({
					data: {
						type: "production.notification.complete",
						status: OPERATION_STATUS.succeeded,
						actorUserId: actor.userId,
						metadata: {
							notificationId: notification.id,
							statusBefore: notification.status,
							statusAfter: "completed",
						},
					},
				});

				const completed = await tx.productionNotification.update({
					where: { id: notification.id },
					data: {
						status: "completed",
						completedByUserId: actor.userId,
						completedAt: new Date(),
						completeOperationId: operation.id,
					},
					include: NOTIFICATION_INCLUDE,
				});

				await tx.auditLog.create({
					data: {
						operationId: operation.id,
						actorUserId: actor.userId,
						action: "production.notification.complete",
						entityType: "production_notification",
						entityId: notification.id,
						details: {
							notificationId: notification.id,
							message: notification.message,
							createdByUserId: notification.createdByUserId,
							completedByUserId: actor.userId,
							statusBefore: notification.status,
							statusAfter: completed.status,
						},
					},
				});

				return completed;
			});

			return mapNotification(record);
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			throw error;
		}
	}
}

function canReadNotifications(role: Actor["role"]): boolean {
	return role === "admin"
		|| role === "director"
		|| role === "production_manager"
		|| role === "commercial_manager";
}

function canCreateNotification(role: Actor["role"]): boolean {
	return role === "admin" || role === "commercial_manager";
}

function canCompleteNotification(role: Actor["role"]): boolean {
	return role === "admin" || role === "production_manager";
}

function buildStatusWhere(status: "new" | "completed" | "all"): Prisma.ProductionNotificationWhereInput {
	if (status === "all") {
		return {};
	}

	return { status };
}
