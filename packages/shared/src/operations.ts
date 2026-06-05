import { z } from "zod";
import { ROLES } from "./roles";

const NonNegativeIntegerSchema = z.number().int().nonnegative();
const OperationHistoryLimitSchema = z.coerce.number().int().min(1).max(100).optional();
const RoleSchema = z.enum(ROLES);

export const OperationHistoryQuerySchema = z.object({
	actorRole: RoleSchema.optional(),
	actorUserId: z.string().min(1).optional(),
	cursor: z.string().min(1).optional(),
	dateFrom: z.string().min(1).optional(),
	dateTo: z.string().min(1).optional(),
	entityType: z.string().min(1).optional(),
	limit: OperationHistoryLimitSchema,
	operationType: z.string().min(1).optional(),
}).strict();

export type OperationHistoryQuery = z.infer<typeof OperationHistoryQuerySchema>;

export const OperationHistoryActorSchema = z.object({
	userId: z.string(),
	login: z.string(),
	displayName: z.string(),
	role: RoleSchema,
});

export type OperationHistoryActor = z.infer<typeof OperationHistoryActorSchema>;

export const OperationHistoryItemSchema = z.object({
	id: z.string(),
	operationId: z.string(),
	operationType: z.string(),
	action: z.string(),
	status: z.string(),
	entityType: z.string(),
	entityId: z.string().nullable(),
	createdAt: z.string(),
	actor: OperationHistoryActorSchema,
	summary: z.string(),
	amountCents: NonNegativeIntegerSchema.optional(),
	quantity: z.union([z.string(), z.number()]).optional(),
	details: z.unknown(),
});

export type OperationHistoryItem = z.infer<typeof OperationHistoryItemSchema>;

export const OperationHistoryResponseSchema = z.object({
	items: z.array(OperationHistoryItemSchema),
	filters: z.object({
		dateFrom: z.string(),
		dateTo: z.string(),
		limit: z.number().int().min(1).max(100),
	}),
	nextCursor: z.string().nullable(),
});

export type OperationHistoryResponse = z.infer<typeof OperationHistoryResponseSchema>;

export const OperationHistoryOptionsResponseSchema = z.object({
	operationTypes: z.array(z.string()),
	roles: z.array(RoleSchema),
	actorUsers: z.array(OperationHistoryActorSchema),
	entityTypes: z.array(z.string()),
});

export type OperationHistoryOptionsResponse = z.infer<typeof OperationHistoryOptionsResponseSchema>;
