const SENSITIVE_KEYS = new Set([
	"accesstoken",
	"hash",
	"password",
	"refreshtoken",
	"secret",
	"token",
]);

export function redactOperationDetails(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => redactOperationDetails(item));
	}

	if (!isRecord(value)) {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, nestedValue]) => [
			key,
			SENSITIVE_KEYS.has(key.toLowerCase()) ? "[redacted]" : redactOperationDetails(nestedValue),
		]),
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
