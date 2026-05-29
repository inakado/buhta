import type {
	CreateDistributorRequest,
	CreatePackagingTypeRequest,
	CreatePackagingIntakeRequest,
	CreateProductBatchRequest,
	CreateProductTemplateRequest,
	CreateProductTransferRequest,
	CreateRawMaterialIntakeRequest,
	CreateRawMaterialTypeRequest,
	CreateUserRequest,
	CreateUserResponse,
	DistributorResponse,
	DistributorsListResponse,
	PackagingBalancesResponse,
	PackagingIntakeResponse,
	PackagingTypeResponse,
	PackagingTypesListResponse,
	ProductBatchResponse,
	ProductBatchesResponse,
	ProductTransferResponse,
	ProductionOptionsResponse,
	ProductionTransferOptionsResponse,
	ProductTemplateResponse,
	ProductTemplatesListResponse,
	ProductionSummaryResponse,
	RawMaterialBalancesResponse,
	RawMaterialIntakeResponse,
	RawMaterialTypeResponse,
	RawMaterialTypesListResponse,
	ResetUserPasswordResponse,
	Role,
	UpdateDistributorRequest,
	UpdatePackagingTypeRequest,
	UpdateProductTemplateRequest,
	UpdateRawMaterialTypeRequest,
	UpdateUserRoleResponse,
	UsersListResponse,
	WorkshopProductBalancesResponse,
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

export async function listRawMaterialTypes(): Promise<RawMaterialTypesListResponse> {
	return fetchJson<RawMaterialTypesListResponse>("/catalog/raw-material-types");
}

export async function createRawMaterialType(
	input: CreateRawMaterialTypeRequest,
): Promise<RawMaterialTypeResponse> {
	return fetchJson<RawMaterialTypeResponse>("/catalog/raw-material-types", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function updateRawMaterialType(
	id: string,
	input: UpdateRawMaterialTypeRequest,
): Promise<RawMaterialTypeResponse> {
	return fetchJson<RawMaterialTypeResponse>(`/catalog/raw-material-types/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export async function archiveRawMaterialType(id: string): Promise<RawMaterialTypeResponse> {
	return fetchJson<RawMaterialTypeResponse>(`/catalog/raw-material-types/${id}/archive`, {
		method: "PATCH",
		body: JSON.stringify({}),
	});
}

export async function listPackagingTypes(): Promise<PackagingTypesListResponse> {
	return fetchJson<PackagingTypesListResponse>("/catalog/packaging-types");
}

export async function createPackagingType(input: CreatePackagingTypeRequest): Promise<PackagingTypeResponse> {
	return fetchJson<PackagingTypeResponse>("/catalog/packaging-types", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function updatePackagingType(
	id: string,
	input: UpdatePackagingTypeRequest,
): Promise<PackagingTypeResponse> {
	return fetchJson<PackagingTypeResponse>(`/catalog/packaging-types/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export async function archivePackagingType(id: string): Promise<PackagingTypeResponse> {
	return fetchJson<PackagingTypeResponse>(`/catalog/packaging-types/${id}/archive`, {
		method: "PATCH",
		body: JSON.stringify({}),
	});
}

export async function listDistributors(): Promise<DistributorsListResponse> {
	return fetchJson<DistributorsListResponse>("/catalog/distributors");
}

export async function createDistributor(input: CreateDistributorRequest): Promise<DistributorResponse> {
	return fetchJson<DistributorResponse>("/catalog/distributors", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function updateDistributor(id: string, input: UpdateDistributorRequest): Promise<DistributorResponse> {
	return fetchJson<DistributorResponse>(`/catalog/distributors/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export async function archiveDistributor(id: string): Promise<DistributorResponse> {
	return fetchJson<DistributorResponse>(`/catalog/distributors/${id}/archive`, {
		method: "PATCH",
		body: JSON.stringify({}),
	});
}

export async function listProductTemplates(): Promise<ProductTemplatesListResponse> {
	return fetchJson<ProductTemplatesListResponse>("/catalog/product-templates");
}

export async function createProductTemplate(
	input: CreateProductTemplateRequest,
): Promise<ProductTemplateResponse> {
	return fetchJson<ProductTemplateResponse>("/catalog/product-templates", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function updateProductTemplate(
	id: string,
	input: UpdateProductTemplateRequest,
): Promise<ProductTemplateResponse> {
	return fetchJson<ProductTemplateResponse>(`/catalog/product-templates/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export async function archiveProductTemplate(id: string): Promise<ProductTemplateResponse> {
	return fetchJson<ProductTemplateResponse>(`/catalog/product-templates/${id}/archive`, {
		method: "PATCH",
		body: JSON.stringify({}),
	});
}

export async function getProductionSummary(): Promise<ProductionSummaryResponse> {
	return fetchJson<ProductionSummaryResponse>("/production/summary");
}

export async function getProductionOptions(): Promise<ProductionOptionsResponse> {
	return fetchJson<ProductionOptionsResponse>("/production/options");
}

export async function listRawMaterialBalances(): Promise<RawMaterialBalancesResponse> {
	return fetchJson<RawMaterialBalancesResponse>("/production/raw-material-balances");
}

export async function createRawMaterialIntake(
	input: CreateRawMaterialIntakeRequest,
): Promise<RawMaterialIntakeResponse> {
	return fetchJson<RawMaterialIntakeResponse>("/production/raw-material-intakes", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function listPackagingBalances(): Promise<PackagingBalancesResponse> {
	return fetchJson<PackagingBalancesResponse>("/production/packaging-balances");
}

export async function createPackagingIntake(input: CreatePackagingIntakeRequest): Promise<PackagingIntakeResponse> {
	return fetchJson<PackagingIntakeResponse>("/production/packaging-intakes", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function listProductBatches(): Promise<ProductBatchesResponse> {
	return fetchJson<ProductBatchesResponse>("/production/product-batches");
}

export async function listWorkshopProductBalances(): Promise<WorkshopProductBalancesResponse> {
	return fetchJson<WorkshopProductBalancesResponse>("/production/workshop-product-balances");
}

export async function getProductionTransferOptions(): Promise<ProductionTransferOptionsResponse> {
	return fetchJson<ProductionTransferOptionsResponse>("/production/transfer-options");
}

export async function createProductBatch(input: CreateProductBatchRequest): Promise<ProductBatchResponse> {
	return fetchJson<ProductBatchResponse>("/production/product-batches", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function createProductTransfer(
	input: CreateProductTransferRequest,
): Promise<ProductTransferResponse> {
	return fetchJson<ProductTransferResponse>("/production/product-transfers", {
		method: "POST",
		body: JSON.stringify(input),
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
