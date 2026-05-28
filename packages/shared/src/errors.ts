import { z } from "zod";

export const APP_ERROR_CODES = [
	"UNAUTHENTICATED",
	"FORBIDDEN",
	"VALIDATION_ERROR",
	"NOT_FOUND",
	"CONFLICT",
	"IDEMPOTENCY_CONFLICT",
	"DOMAIN_RULE_VIOLATION",
	"INTERNAL_ERROR",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export const AppErrorResponseSchema = z.object({
	error: z.object({
		code: z.enum(APP_ERROR_CODES),
		message: z.string(),
		details: z.unknown().optional(),
	}),
});

export type AppErrorResponse = z.infer<typeof AppErrorResponseSchema>;
