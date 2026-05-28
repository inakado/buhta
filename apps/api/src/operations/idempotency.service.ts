import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { AppError } from "../common/errors/app-error";

@Injectable()
export class IdempotencyService {
	hashRequest(command: unknown): string {
		return createHash("sha256").update(stableStringify(command)).digest("hex");
	}

	assertSameRequest(expectedHash: string, command: unknown): void {
		const actualHash = this.hashRequest(command);
		if (expectedHash !== actualHash) {
			throw new AppError("IDEMPOTENCY_CONFLICT", "Idempotency key was reused with a different request");
		}
	}
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}

	if (value && typeof value === "object") {
		return `{${Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
			.join(",")}}`;
	}

	return JSON.stringify(value);
}
