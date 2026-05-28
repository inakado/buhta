import type {
	CreateUserRequest,
	CreateUserResponse,
	ResetUserPasswordResponse,
	Role,
	UpdateUserRoleResponse,
	UsersListResponse,
} from "@buhta/shared";
import { API_BASE_URL } from "./api";
import { toUserErrorMessage } from "./error-messages";

export type CurrentActor = {
	userId: string;
	login: string;
	displayName: string;
	role: Role;
	permissions: string[];
};

export type CurrentActorResponse = {
	authenticated: boolean;
	actor: CurrentActor | null;
};

export class ApiClientError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "ApiClientError";
	}
}

export function isUnauthorizedError(error: unknown): boolean {
	return error instanceof ApiClientError && error.status === 401;
}

export async function getCurrentActor(): Promise<CurrentActorResponse> {
	return fetchJson<CurrentActorResponse>("/auth/me");
}

export async function signIn(input: { login: string; password: string }): Promise<void> {
	await fetchJson("/api/auth/sign-in/username", {
		method: "POST",
		body: JSON.stringify({
			username: input.login,
			password: input.password,
		}),
	});
}

export async function signOut(): Promise<void> {
	await fetchJson("/api/auth/sign-out", {
		method: "POST",
		body: JSON.stringify({}),
	});
}

export async function listUsers(): Promise<UsersListResponse> {
	return fetchJson<UsersListResponse>("/users");
}

export async function createUser(input: CreateUserRequest): Promise<CreateUserResponse> {
	return fetchJson<CreateUserResponse>("/users", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function updateUserRole(userId: string, role: Role): Promise<UpdateUserRoleResponse> {
	return fetchJson<UpdateUserRoleResponse>(`/users/${userId}/role`, {
		method: "PATCH",
		body: JSON.stringify({ role }),
	});
}

export async function resetUserPassword(userId: string): Promise<ResetUserPasswordResponse> {
	return fetchJson<ResetUserPasswordResponse>(`/users/${userId}/reset-password`, {
		method: "POST",
		body: JSON.stringify({}),
	});
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	});

	if (!response.ok) {
		throw new ApiClientError(await readErrorMessage(response), response.status);
	}

	return (await readResponseJson(response)) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const data = (await response.json()) as { error?: { message?: string }; message?: string };
		return toUserErrorMessage(data.error?.message ?? data.message ?? `Request failed: ${response.status}`);
	} catch {
		return toUserErrorMessage(`Request failed: ${response.status}`);
	}
}

async function readResponseJson(response: Response): Promise<unknown> {
	if (response.status === 204) {
		return null;
	}

	const text = await response.text();

	if (!text) {
		return null;
	}

	return JSON.parse(text);
}
