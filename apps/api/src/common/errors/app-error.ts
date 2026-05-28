import type { AppErrorCode } from "@buhta/shared";

export class AppError extends Error {
	readonly code: AppErrorCode;
	readonly details?: unknown;

	constructor(code: AppErrorCode, message: string, details?: unknown) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.details = details;
	}
}
