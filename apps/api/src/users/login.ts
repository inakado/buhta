import { randomBytes } from "node:crypto";

const LOGIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const INTERNAL_EMAIL_DOMAIN = "internal.buhta.local";

export function normalizeLogin(login: string): string {
	return login.trim().toLowerCase();
}

export function isValidLogin(login: string): boolean {
	return LOGIN_PATTERN.test(login);
}

export function assertValidLogin(login: string): string {
	const normalizedLogin = normalizeLogin(login);

	if (!isValidLogin(normalizedLogin)) {
		throw new Error("Invalid login");
	}

	return normalizedLogin;
}

export function technicalEmailForLogin(login: string): string {
	return `${assertValidLogin(login)}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function generateLoginCandidate(name: string): string {
	const base = normalizeLogin(name)
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 18);
	const prefix = base && /^[a-z0-9]/.test(base) ? base : "user";

	return `${prefix}-${randomToken(6)}`.slice(0, 30).replace(/-+$/g, "");
}

export function generateTemporaryPassword(): string {
	return `Buh-${randomToken(6)}-${randomToken(6)}1!`;
}

function randomToken(length: number): string {
	const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
	const bytes = randomBytes(length);

	return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
