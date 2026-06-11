import type {
	ClientResponse,
	ClientsListResponse,
	CreateClientRequest,
	CreateNotificationRequest,
	CreateCourierLoadRequest,
	CreateCourierSaleRequest,
	CreateCourierUnloadRequest,
	CreateDistributorRequest,
	CreateDistributorCashWithdrawalRequest,
	CreateDistributorSaleRequest,
	CancelCourierSaleRequest,
	CancelCourierSaleResponse,
	CancelDistributorSaleRequest,
	CancelDistributorSaleResponse,
	AssignDistributorDiscountRequest,
	AssignDistributorDiscountResponse,
	ChangeOwnPasswordRequest,
	ChangeOwnPasswordResponse,
	CreatePackagingTypeRequest,
	CreatePackagingIntakeRequest,
	CreateProductBatchRequest,
	CreateProductTemplateRequest,
	CreateProductTransferRequest,
	CreateRawMaterialIntakeRequest,
	CreateRawMaterialTypeRequest,
	CreateUserRequest,
	CreateUserResponse,
	DirectorAnalyticsQuery,
	DirectorAnalyticsResponse,
	CourierCashBalancesResponse,
	CourierLoadOptionsResponse,
	CourierLoadResponse,
	CourierProductBalancesResponse,
	CourierRecentSalesResponse,
	CourierSalesHistoryQuery,
	CourierSalesHistoryResponse,
	CourierSaleOptionsResponse,
	CourierSaleResponse,
	CourierUnloadOptionsResponse,
	CourierUnloadResponse,
	DistributorCashBalancesResponse,
	DistributorCashWithdrawalResponse,
	DistributorInventoryResponse,
	DistributorRecentSalesResponse,
	DistributorSalesHistoryQuery,
	DistributorSalesHistoryResponse,
	DistributorSaleOptionsResponse,
	DistributorSaleResponse,
	DistributorResponse,
	DistributorsListResponse,
	PackagingBalancesResponse,
	PackagingIntakeResponse,
	PackagingTypeResponse,
	PackagingTypesListResponse,
	NotificationResponse,
	NotificationsListResponse,
	OperationHistoryOptionsResponse,
	OperationHistoryQuery,
	OperationHistoryResponse,
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
	UpdateClientRequest,
	UpdateDistributorRequest,
	UpdatePackagingTypeRequest,
	UpdateProductTemplateRequest,
	UpdateRawMaterialTypeRequest,
	UpdateUserIdentityRequest,
	UpdateUserIdentityResponse,
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

export async function updateUserIdentity(
	userId: string,
	input: UpdateUserIdentityRequest,
): Promise<UpdateUserIdentityResponse> {
	return fetchJson<UpdateUserIdentityResponse>(`/users/${userId}/identity`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export async function resetUserPassword(userId: string): Promise<ResetUserPasswordResponse> {
	return fetchJson<ResetUserPasswordResponse>(`/users/${userId}/reset-password`, {
		method: "POST",
		body: JSON.stringify({}),
	});
}

export async function changeOwnPassword(input: ChangeOwnPasswordRequest): Promise<ChangeOwnPasswordResponse> {
	return fetchJson<ChangeOwnPasswordResponse>("/account/password", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function listClients(search?: string): Promise<ClientsListResponse> {
	const params = new URLSearchParams();
	if (search?.trim()) {
		params.set("search", search.trim());
	}
	const query = params.toString();
	return fetchJson<ClientsListResponse>(`/clients${query ? `?${query}` : ""}`);
}

export async function createClient(input: CreateClientRequest): Promise<ClientResponse> {
	return fetchJson<ClientResponse>("/clients", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function updateClient(id: string, input: UpdateClientRequest): Promise<ClientResponse> {
	return fetchJson<ClientResponse>(`/clients/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export async function listNotifications(status: "new" | "completed" | "all" = "all"): Promise<NotificationsListResponse> {
	const params = new URLSearchParams();
	if (status !== "all") {
		params.set("status", status);
	}
	const query = params.toString();

	return fetchJson<NotificationsListResponse>(`/notifications${query ? `?${query}` : ""}`);
}

export async function createNotification(input: CreateNotificationRequest): Promise<NotificationResponse> {
	return fetchJson<NotificationResponse>("/notifications", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function completeNotification(notificationId: string): Promise<NotificationResponse> {
	return fetchJson<NotificationResponse>(`/notifications/${notificationId}/complete`, {
		method: "PATCH",
		body: JSON.stringify({}),
	});
}

export async function getOperationHistory(query: OperationHistoryQuery = {}): Promise<OperationHistoryResponse> {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== "") {
			params.set(key, String(value));
		}
	}

	const queryString = params.toString();
	return fetchJson<OperationHistoryResponse>(`/operations/history${queryString ? `?${queryString}` : ""}`);
}

export async function getOperationHistoryOptions(): Promise<OperationHistoryOptionsResponse> {
	return fetchJson<OperationHistoryOptionsResponse>("/operations/history/options");
}

export async function getDirectorAnalytics(
	query: DirectorAnalyticsQuery = {},
): Promise<DirectorAnalyticsResponse> {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== "") {
			params.set(key, String(value));
		}
	}

	const queryString = params.toString();
	return fetchJson<DirectorAnalyticsResponse>(`/analytics/director${queryString ? `?${queryString}` : ""}`);
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
		...idempotentJsonPost(input),
	});
}

export async function listPackagingBalances(): Promise<PackagingBalancesResponse> {
	return fetchJson<PackagingBalancesResponse>("/production/packaging-balances");
}

export async function createPackagingIntake(input: CreatePackagingIntakeRequest): Promise<PackagingIntakeResponse> {
	return fetchJson<PackagingIntakeResponse>("/production/packaging-intakes", {
		...idempotentJsonPost(input),
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
		...idempotentJsonPost(input),
	});
}

export async function createProductTransfer(
	input: CreateProductTransferRequest,
): Promise<ProductTransferResponse> {
	return fetchJson<ProductTransferResponse>("/production/product-transfers", {
		...idempotentJsonPost(input),
	});
}

export async function getDistributorInventory(): Promise<DistributorInventoryResponse> {
	return fetchJson<DistributorInventoryResponse>("/distributor/inventory");
}

export async function getCourierLoadOptions(): Promise<CourierLoadOptionsResponse> {
	return fetchJson<CourierLoadOptionsResponse>("/courier/load-options");
}

export async function getCourierProductBalances(): Promise<CourierProductBalancesResponse> {
	return fetchJson<CourierProductBalancesResponse>("/courier/product-balances");
}

export async function getCourierCashBalances(): Promise<CourierCashBalancesResponse> {
	return fetchJson<CourierCashBalancesResponse>("/courier/cash-balances");
}

export async function createCourierLoad(input: CreateCourierLoadRequest): Promise<CourierLoadResponse> {
	return fetchJson<CourierLoadResponse>("/courier/loads", {
		...idempotentJsonPost(input),
	});
}

export async function getCourierSaleOptions(): Promise<CourierSaleOptionsResponse> {
	return fetchJson<CourierSaleOptionsResponse>("/courier/sale-options");
}

export async function getCourierRecentSales(limit = 5): Promise<CourierRecentSalesResponse> {
	return fetchJson<CourierRecentSalesResponse>(`/courier/sales/recent?limit=${limit}`);
}

export async function getCourierSalesHistory(
	query: CourierSalesHistoryQuery = {},
): Promise<CourierSalesHistoryResponse> {
	const queryString = buildQueryString(query);
	return fetchJson<CourierSalesHistoryResponse>(`/courier/sales/history${queryString}`);
}

export async function createCourierSale(input: CreateCourierSaleRequest): Promise<CourierSaleResponse> {
	return fetchJson<CourierSaleResponse>("/courier/sales", {
		...idempotentJsonPost(input),
	});
}

export async function cancelCourierSale(
	saleId: string,
	input: CancelCourierSaleRequest,
): Promise<CancelCourierSaleResponse> {
	return fetchJson<CancelCourierSaleResponse>(`/courier/sales/${saleId}/cancel`, {
		...idempotentJsonPost(input),
	});
}

export async function getCourierUnloadOptions(): Promise<CourierUnloadOptionsResponse> {
	return fetchJson<CourierUnloadOptionsResponse>("/courier/unload-options");
}

export async function createCourierUnload(input: CreateCourierUnloadRequest): Promise<CourierUnloadResponse> {
	return fetchJson<CourierUnloadResponse>("/courier/unloads", {
		...idempotentJsonPost(input),
	});
}

export async function getDistributorSaleOptions(): Promise<DistributorSaleOptionsResponse> {
	return fetchJson<DistributorSaleOptionsResponse>("/distributor/sale-options");
}

export async function getDistributorRecentSales(limit = 5): Promise<DistributorRecentSalesResponse> {
	return fetchJson<DistributorRecentSalesResponse>(`/distributor/sales/recent?limit=${limit}`);
}

export async function getDistributorSalesHistory(
	query: DistributorSalesHistoryQuery = {},
): Promise<DistributorSalesHistoryResponse> {
	const queryString = buildQueryString(query);
	return fetchJson<DistributorSalesHistoryResponse>(`/distributor/sales/history${queryString}`);
}

export async function getDistributorCashBalances(): Promise<DistributorCashBalancesResponse> {
	return fetchJson<DistributorCashBalancesResponse>("/distributor/cash-balances");
}

export async function createDistributorCashWithdrawal(
	input: CreateDistributorCashWithdrawalRequest,
): Promise<DistributorCashWithdrawalResponse> {
	return fetchJson<DistributorCashWithdrawalResponse>("/distributor/cash-withdrawals", {
		...idempotentJsonPost(input),
	});
}

export async function assignDistributorDiscount(
	input: AssignDistributorDiscountRequest,
): Promise<AssignDistributorDiscountResponse> {
	return fetchJson<AssignDistributorDiscountResponse>("/distributor/discounts", {
		...idempotentJsonPost(input),
	});
}

export async function createDistributorSale(
	input: CreateDistributorSaleRequest,
): Promise<DistributorSaleResponse> {
	return fetchJson<DistributorSaleResponse>("/distributor/sales", {
		...idempotentJsonPost(input),
	});
}

export async function cancelDistributorSale(
	saleId: string,
	input: CancelDistributorSaleRequest,
): Promise<CancelDistributorSaleResponse> {
	return fetchJson<CancelDistributorSaleResponse>(`/distributor/sales/${saleId}/cancel`, {
		...idempotentJsonPost(input),
	});
}

function idempotentJsonPost(input: unknown): RequestInit {
	return {
		method: "POST",
		headers: {
			"Idempotency-Key": createIdempotencyKey(),
		},
		body: JSON.stringify(input),
	};
}

function createIdempotencyKey(): string {
	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function buildQueryString(query: Record<string, unknown>): string {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== "") {
			params.set(key, String(value));
		}
	}

	const queryString = params.toString();
	return queryString ? `?${queryString}` : "";
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
