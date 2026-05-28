import { HttpStatus } from "@nestjs/common";
import type { AppErrorResponse } from "@buhta/shared";
import { AppError } from "./app-error";

export function httpStatusForAppError(error: AppError): number {
	switch (error.code) {
		case "UNAUTHENTICATED":
			return HttpStatus.UNAUTHORIZED;
		case "FORBIDDEN":
			return HttpStatus.FORBIDDEN;
		case "VALIDATION_ERROR":
			return HttpStatus.BAD_REQUEST;
		case "NOT_FOUND":
			return HttpStatus.NOT_FOUND;
		case "CONFLICT":
		case "IDEMPOTENCY_CONFLICT":
			return HttpStatus.CONFLICT;
		case "DOMAIN_RULE_VIOLATION":
			return HttpStatus.UNPROCESSABLE_ENTITY;
		case "INTERNAL_ERROR":
			return HttpStatus.INTERNAL_SERVER_ERROR;
	}
}

export function appErrorResponse(error: AppError): AppErrorResponse {
	return {
		error: {
			code: error.code,
			message: error.message,
			...(error.details === undefined ? {} : { details: error.details }),
		},
	};
}
