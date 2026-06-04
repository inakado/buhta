import { z } from "zod";

export const NotificationStatusSchema = z.enum(["new", "completed"]);

export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

const NotificationMessageSchema = z.string().trim().min(1).max(1000);

export const CreateNotificationRequestSchema = z.object({
	message: NotificationMessageSchema,
});

export type CreateNotificationRequest = z.infer<typeof CreateNotificationRequestSchema>;

export const CompleteNotificationRequestSchema = z.object({}).strict();

export type CompleteNotificationRequest = z.infer<typeof CompleteNotificationRequestSchema>;

export const NotificationActorSchema = z.object({
	userId: z.string(),
	login: z.string(),
	displayName: z.string(),
});

export type NotificationActor = z.infer<typeof NotificationActorSchema>;

export const NotificationSchema = z.object({
	id: z.string(),
	message: z.string(),
	status: NotificationStatusSchema,
	createdBy: NotificationActorSchema,
	completedBy: NotificationActorSchema.nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	completedAt: z.string().nullable(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsListQuerySchema = z.object({
	status: z.enum(["new", "completed", "all"]).optional(),
});

export type NotificationsListQuery = z.infer<typeof NotificationsListQuerySchema>;

export const NotificationsSummarySchema = z.object({
	newCount: z.number().int().nonnegative(),
	completedCount: z.number().int().nonnegative(),
});

export type NotificationsSummary = z.infer<typeof NotificationsSummarySchema>;

export const NotificationsListResponseSchema = z.object({
	items: z.array(NotificationSchema),
	summary: NotificationsSummarySchema,
});

export type NotificationsListResponse = z.infer<typeof NotificationsListResponseSchema>;

export const NotificationResponseSchema = z.object({
	notification: NotificationSchema,
});

export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
