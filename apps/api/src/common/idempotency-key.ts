import { AppError } from "./errors/app-error";

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

export function requireIdempotencyKey(value: string | undefined): string {
	const key = value?.trim();

	if (!key) {
		throw new AppError("VALIDATION_ERROR", "Idempotency-Key header is required");
	}

	if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
		throw new AppError("VALIDATION_ERROR", "Idempotency-Key header is too long", {
			maxLength: MAX_IDEMPOTENCY_KEY_LENGTH,
		});
	}

	return key;
}
