import type { Notification } from "@buhta/shared";

type NotificationRecord = {
	id: string;
	message: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	completedAt: Date | null;
	createdBy: {
		id: string;
		username: string | null;
		email: string;
		name: string;
		displayUsername: string | null;
	};
	completedBy: {
		id: string;
		username: string | null;
		email: string;
		name: string;
		displayUsername: string | null;
	} | null;
};

export function mapNotification(record: NotificationRecord): Notification {
	return {
		id: record.id,
		message: record.message,
		status: record.status === "completed" ? "completed" : "new",
		createdBy: mapNotificationActor(record.createdBy),
		completedBy: record.completedBy ? mapNotificationActor(record.completedBy) : null,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
		completedAt: record.completedAt?.toISOString() ?? null,
	};
}

function mapNotificationActor(actor: NotificationRecord["createdBy"]): Notification["createdBy"] {
	const login = actor.username ?? actor.email ?? actor.id;

	return {
		userId: actor.id,
		login,
		displayName: actor.name ?? actor.displayUsername ?? login,
	};
}
