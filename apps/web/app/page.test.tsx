import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@buhta/shared";
import HomePage from "./page";

const adminActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-admin",
		login: "admin",
		displayName: "Admin",
		role: "admin",
		permissions: ["users.manage", "catalog.manage", "client.read", "client.manage", "distributor.sale.create"],
	},
};

const productionActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-production-manager",
		login: "production-manager",
		displayName: "Production Manager",
		role: "production_manager",
		permissions: ["production.manage", "distributor.stock.read"],
	},
};

const commercialActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-commercial-manager",
		login: "commercial-manager",
		displayName: "Commercial Manager",
		role: "commercial_manager",
		permissions: [
			"distributor.stock.read",
			"distributor.cash.read",
			"courier.stock.read",
			"courier.cash.read",
			"distributor.sale.create",
			"client.read",
			"client.manage",
		],
	},
};

const distributorWorkerActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-distributor-worker",
		login: "distributor-worker",
		displayName: "Distributor Worker",
		role: "distributor_worker",
		permissions: [
			"distributor.stock.read",
			"distributor.cash.read",
			"distributor.sale.create",
			"client.read",
			"client.manage",
		],
	},
};

const directorActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-director",
		login: "director",
		displayName: "Director",
		role: "director",
		permissions: ["distributor.stock.read", "distributor.cash.read", "courier.stock.read", "courier.cash.read", "client.read"],
	},
};

const courierActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-courier",
		login: "courier",
		displayName: "Courier",
		role: "courier",
		permissions: [
			"distributor.stock.read",
			"courier.stock.read",
			"courier.stock.load",
			"courier.cash.read",
			"courier.sale.create",
			"client.read",
			"client.manage",
		],
	},
};

const distributorInventoryResponse = {
	summary: {
		distributorCount: 1,
		stockItemCount: 1,
		totalUnits: 2,
		totalStockValueCents: 250000,
	},
	distributorSummaries: [{
		distributorId: "dist1",
		distributorName: "Распределитель Центральный",
		stockItemCount: 1,
		totalUnits: 2,
		totalStockValueCents: 250000,
	}],
	items: [{
		id: "distributor-balance1",
		distributorId: "dist1",
		distributorName: "Распределитель Центральный",
		productBatchId: "batch1",
		productName: "Икра горбуши",
		priceCents: 125000,
		quantity: 2,
		stockValueCents: 250000,
		updatedAt: new Date(0).toISOString(),
	}],
};

const distributorCashBalancesResponse = {
	totalAmountCents: 125000,
	items: [{
		distributorId: "dist1",
		distributorName: "Распределитель Центральный",
		amountCents: 125000,
		updatedAt: new Date(0).toISOString(),
	}],
};

const distributorSaleOptionsResponse = {
	items: [{
		distributorProductBalanceId: "distributor-balance1",
		distributorId: "dist1",
		distributorName: "Распределитель Центральный",
		productBatchId: "batch1",
		productName: "Икра горбуши",
		unitPriceCents: 125000,
		availableQuantity: 2,
		stockValueCents: 250000,
		updatedAt: new Date(0).toISOString(),
	}],
};

const courierProductBalancesResponse = {
	summary: {
		courierCount: 1,
		stockItemCount: 1,
		totalUnits: 2,
		totalStockValueCents: 250000,
	},
	courierSummaries: [{
		courierUserId: "seed-courier",
		courierLogin: "courier",
		courierDisplayName: "Courier",
		stockItemCount: 1,
		totalUnits: 2,
		totalStockValueCents: 250000,
	}],
	items: [{
		id: "courier-balance1",
		courierUserId: "seed-courier",
		courierLogin: "courier",
		courierDisplayName: "Courier",
		productBatchId: "batch1",
		productName: "Икра горбуши",
		unitPriceCents: 125000,
		quantity: 2,
		stockValueCents: 250000,
		updatedAt: new Date(0).toISOString(),
	}],
};

const courierLoadOptionsResponse = {
	items: [{
		distributorProductBalanceId: "distributor-balance1",
		distributorId: "dist1",
		distributorName: "Распределитель Центральный",
		productBatchId: "batch1",
		productName: "Икра горбуши",
		unitPriceCents: 125000,
		availableQuantity: 2,
		stockValueCents: 250000,
		updatedAt: new Date(0).toISOString(),
	}],
};

const courierCashBalancesResponse = {
	totalAmountCents: 70000,
	courierCount: 1,
	items: [{
		courierUserId: "seed-courier",
		courierLogin: "courier",
		courierDisplayName: "Courier",
		amountCents: 70000,
		updatedAt: new Date(0).toISOString(),
	}],
};

const courierSaleOptionsResponse = {
	items: [{
		courierProductBalanceId: "courier-balance1",
		courierUserId: "seed-courier",
		courierLogin: "courier",
		courierDisplayName: "Courier",
		productBatchId: "batch1",
		productName: "Икра горбуши",
		unitPriceCents: 125000,
		availableQuantity: 2,
		stockValueCents: 250000,
		updatedAt: new Date(0).toISOString(),
	}],
};

const clientsResponse: { clients: Client[] } = {
	clients: [{
		id: "client1",
		name: "Иван Петров",
		phone: "+7 (999) 123-45-67",
		phoneNormalized: "79991234567",
		description: "Постоянный клиент",
		createdByUserId: "seed-commercial-manager",
		createdAt: new Date(0).toISOString(),
		updatedAt: new Date(0).toISOString(),
	}],
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

async function selectOperationProduct(optionName: RegExp | string) {
	fireEvent.change(await screen.findByRole("combobox", { name: "Продукция" }), { target: { value: "Икра" } });
	fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

describe("HomePage", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders the CRM app entry", () => {
		render(<HomePage />);
		expect(screen.getByText("Загрузка Бухты")).toBeTruthy();
	});

	it("moves an authenticated admin to the login form after logout", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(adminActorResponse);
			}

			if (url.endsWith("/users")) {
				return jsonResponse({ users: [] });
			}

			if (url.endsWith("/api/auth/sign-out")) {
				return jsonResponse({ success: true });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Настройки" }));
		fireEvent.click(await screen.findByRole("button", { name: "Выйти" }));

		expect(await screen.findByText("Логин")).toBeTruthy();
		expect(screen.getByText("Пароль")).toBeTruthy();

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/auth/sign-out"),
				expect.objectContaining({ method: "POST" }),
			);
		});
	});

	it("renders admin users as an access list and manages temporary passwords", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(adminActorResponse);
			}

			if (url.endsWith("/users/u-courier/reset-password") && method === "POST") {
				return jsonResponse({
					user: {
						id: "u-courier",
						name: "Courier Browser",
						login: "courier-browser",
						role: "courier",
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					},
					temporaryPassword: "Reset123!",
				});
			}

			if (url.endsWith("/users") && method === "POST") {
				return jsonResponse({
					user: {
						id: "u-new",
						name: "Новый сотрудник",
						login: "new-user",
						role: "courier",
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					},
					temporaryPassword: "Temp123!",
				});
			}

			if (url.endsWith("/users")) {
				return jsonResponse({
					users: [
						{
							id: "u-courier",
							name: "Courier Browser",
							login: "courier-browser",
							role: "courier",
							createdAt: new Date(0).toISOString(),
							updatedAt: new Date(0).toISOString(),
						},
					],
				});
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByRole("heading", { name: "Пользователи" })).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Новый сотрудник" })).toBeNull();
		expect(await screen.findByText("Courier Browser")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Новый" }));
		fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Новый сотрудник" } });
		fireEvent.change(screen.getByLabelText("Логин"), { target: { value: "new-user" } });
		fireEvent.click(screen.getByRole("button", { name: "Создать" }));

		expect(await screen.findByText("Temp123!")).toBeTruthy();
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/users"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ name: "Новый сотрудник", role: "courier", login: "new-user" }),
				}),
			);
		});

		fireEvent.click(screen.getByRole("button", { name: "Сбросить пароль Courier Browser" }));
		fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

		expect(await screen.findByText("Reset123!")).toBeTruthy();
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/users/u-courier/reset-password"),
				expect.objectContaining({ method: "POST" }),
			);
		});
	});

	it("renders catalog management for an admin and submits raw material type", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(adminActorResponse);
			}

			if (url.endsWith("/users")) {
				return jsonResponse({ users: [] });
			}

			if (url.endsWith("/catalog/raw-material-types/raw1/archive") && method === "PATCH") {
				return jsonResponse({
					rawMaterialType: {
						id: "raw1",
						name: "Горбуша",
						unit: "кг",
						active: false,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					},
				});
			}

			if (url.endsWith("/catalog/raw-material-types") && method === "POST") {
				return jsonResponse({
					rawMaterialType: {
						id: "raw3",
						name: "Кета",
						unit: "кг",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					},
				});
			}

			if (url.endsWith("/catalog/raw-material-types")) {
				return jsonResponse({
					rawMaterialTypes: [{
						id: "raw1",
						name: "Горбуша",
						unit: "кг",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}, {
						id: "raw2",
						name: "Архивная горбуша",
						unit: "кг",
						active: false,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/catalog/packaging-types")) {
				return jsonResponse({ packagingTypes: [] });
			}

			if (url.endsWith("/catalog/distributors")) {
				return jsonResponse({ distributors: [] });
			}

			if (url.endsWith("/catalog/product-templates")) {
				return jsonResponse({ productTemplates: [] });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Каталог" }));
		expect(await screen.findByText("Горбуша")).toBeTruthy();
		expect(screen.queryByText("Архивная горбуша")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Архив (1)" }));
		expect(await screen.findByText("Архивная горбуша")).toBeTruthy();
		expect(screen.queryByText("Горбуша")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Показать активные" }));
		fireEvent.click(await screen.findByRole("button", { name: "В архив" }));
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/catalog/raw-material-types/raw1/archive"),
				expect.objectContaining({ method: "PATCH" }),
			);
		});

		fireEvent.change(await screen.findByLabelText("Название"), { target: { value: "Кета" } });
		fireEvent.change(screen.getByLabelText("Единица измерения"), { target: { value: "кг" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/catalog/raw-material-types"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ name: "Кета", unit: "кг" }),
				}),
			);
		});
	});

	it("keeps the active list switch visible when an archive is empty", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(adminActorResponse);
			}

			if (url.endsWith("/users")) {
				return jsonResponse({ users: [] });
			}

			if (url.endsWith("/catalog/raw-material-types")) {
				return jsonResponse({ rawMaterialTypes: [] });
			}

			if (url.endsWith("/catalog/packaging-types")) {
				return jsonResponse({ packagingTypes: [] });
			}

			if (url.endsWith("/catalog/distributors")) {
				return jsonResponse({ distributors: [] });
			}

			if (url.endsWith("/catalog/product-templates")) {
				return jsonResponse({ productTemplates: [] });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Каталог" }));
		fireEvent.click(screen.getByRole("button", { name: "Архив (0)" }));

		expect(await screen.findByText("В архиве пока пусто")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Показать активные" }));
		expect(await screen.findByText("Активных записей пока нет")).toBeTruthy();
	});

	it("renders production release flow and submits product batch", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(productionActorResponse);
			}

			if (url.endsWith("/production/summary")) {
				return jsonResponse({
					summary: {
						readyProductUnits: 4,
						rawMaterialKinds: 1,
						rawMaterialTotal: 12.5,
						rawMaterialUnit: "кг",
						packagingKinds: 1,
						packagingTotal: 8,
						packagingUnit: "шт",
					},
				});
			}

			if (url.endsWith("/production/raw-material-balances")) {
				return jsonResponse({
					rawMaterialBalances: [{
						id: "raw-balance1",
						typeId: "raw1",
						name: "Горбуша",
						unit: "кг",
						quantity: 12.5,
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/production/raw-material-intakes") && method === "POST") {
				return jsonResponse({
					rawMaterialBalance: {
						id: "raw-balance1",
						typeId: "raw1",
						name: "Горбуша",
						unit: "кг",
						quantity: 15.5,
						updatedAt: new Date(0).toISOString(),
					},
				});
			}

			if (url.endsWith("/production/packaging-balances")) {
				return jsonResponse({
					packagingBalances: [{
						id: "pack-balance1",
						typeId: "pack1",
						name: "Банка",
						unit: "шт",
						quantity: 8,
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/production/packaging-intakes") && method === "POST") {
				return jsonResponse({
					packagingBalance: {
						id: "pack-balance1",
						typeId: "pack1",
						name: "Банка",
						unit: "шт",
						quantity: 18,
						updatedAt: new Date(0).toISOString(),
					},
				});
			}

			if (url.endsWith("/production/workshop-product-balances")) {
				return jsonResponse({
					workshopProductBalances: [{
						id: "workshop-balance1",
						productBatchId: "batch1",
						productName: "Икра горбуши",
						priceCents: 125000,
						quantity: 4,
						producedQuantity: 4,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/production/transfer-options")) {
				return jsonResponse({
					distributors: [{
						id: "dist1",
						name: "Распределитель Центральный",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
					workshopProductBalances: [{
						id: "workshop-balance1",
						productBatchId: "batch1",
						productName: "Икра горбуши",
						priceCents: 125000,
						quantity: 4,
						producedQuantity: 4,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/production/product-batches") && method === "POST") {
				return jsonResponse({
					productBatch: {
						id: "batch1",
						productTemplateId: "template1",
						productName: "Икра горбуши",
						rawMaterialTypeId: "raw1",
						rawMaterialTypeName: "Горбуша",
						rawMaterialUnit: "кг",
						packagingTypeId: "pack1",
						packagingTypeName: "Банка",
						packagingUnit: "шт",
						priceCents: 125000,
						quantity: 4,
						consumedRawMaterialQuantity: 6.25,
						consumedPackagingQuantity: 4,
						status: "in_workshop",
						createdAt: new Date(0).toISOString(),
					},
				});
			}

			if (url.endsWith("/production/product-transfers") && method === "POST") {
				return jsonResponse({
					transfer: {
						id: "transfer1",
						productBatchId: "batch1",
						distributorId: "dist1",
						quantity: 2,
						comment: "На Центральный",
						operationId: "op1",
						actorUserId: "seed-production-manager",
						createdAt: new Date(0).toISOString(),
					},
					workshopProductBalance: {
						id: "workshop-balance1",
						productBatchId: "batch1",
						productName: "Икра горбуши",
						priceCents: 125000,
						quantity: 2,
						producedQuantity: 4,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					},
					distributorProductBalance: {
						id: "distributor-balance1",
						distributorId: "dist1",
						distributorName: "Распределитель Центральный",
						productBatchId: "batch1",
						productName: "Икра горбуши",
						priceCents: 125000,
						quantity: 2,
						updatedAt: new Date(0).toISOString(),
					},
				});
			}

			if (url.endsWith("/production/product-batches")) {
				return jsonResponse({
					productBatches: [{
						id: "batch1",
						productTemplateId: "template1",
						productName: "Икра горбуши",
						rawMaterialTypeId: "raw1",
						rawMaterialTypeName: "Горбуша",
						rawMaterialUnit: "кг",
						packagingTypeId: "pack1",
						packagingTypeName: "Банка",
						packagingUnit: "шт",
						priceCents: 125000,
						quantity: 4,
						consumedRawMaterialQuantity: 6.25,
						consumedPackagingQuantity: 4,
						status: "in_workshop",
						createdAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/production/options")) {
				return jsonResponse({
					rawMaterialTypes: [{
						id: "raw1",
						name: "Горбуша",
						unit: "кг",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}, {
						id: "raw2",
						name: "Икра осетр",
						unit: "кг",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
					packagingTypes: [{
						id: "pack1",
						name: "Банка",
						unit: "шт",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}, {
						id: "pack2",
						name: "Коробка",
						unit: "шт",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
					productTemplates: [{
						id: "template1",
						name: "Икра горбуши",
						rawMaterialTypeId: "raw1",
						rawMaterialType: {
							id: "raw1",
							name: "Горбуша",
							unit: "кг",
							active: true,
							createdAt: new Date(0).toISOString(),
							updatedAt: new Date(0).toISOString(),
						},
						packagingTypeId: "pack1",
						packagingType: {
							id: "pack1",
							name: "Банка",
							unit: "шт",
							active: true,
							createdAt: new Date(0).toISOString(),
							updatedAt: new Date(0).toISOString(),
						},
						priceCents: 125000,
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByText("Цех")).toBeTruthy();
		expect(await screen.findByRole("button", { name: "Продукция 4 шт" })).toBeTruthy();
		expect(screen.queryByRole("navigation", { name: "Основная навигация" })?.textContent).not.toContain("Выпуск");
		expect(screen.queryByText("Икра горбуши")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Добавить сырье" }));
		expect(await screen.findByRole("heading", { name: "Приход сырья" })).toBeTruthy();
		fireEvent.change(await screen.findByLabelText("Вид сырья"), { target: { value: "raw1" } });
		fireEvent.change(screen.getByLabelText("Количество"), { target: { value: "-1" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать приход" }));
		expect(await screen.findByText("Количество: введите положительное число.")).toBeTruthy();
		expect(screen.queryByText("Сырье добавлено")).toBeNull();
		fireEvent.change(screen.getByLabelText("Количество"), { target: { value: "3" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать приход" }));
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/production/raw-material-intakes"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ rawMaterialTypeId: "raw1", quantity: 3 }),
				}),
			);
		});
		expect(await screen.findByText("Сырье добавлено")).toBeTruthy();
		expect(screen.queryByLabelText("Вид сырья")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Добавить тару" }));
		expect(await screen.findByRole("heading", { name: "Приход тары" })).toBeTruthy();
		fireEvent.change(await screen.findByLabelText("Вид тары"), { target: { value: "pack1" } });
		fireEvent.change(screen.getByLabelText("Количество"), { target: { value: "10" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать приход" }));
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/production/packaging-intakes"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ packagingTypeId: "pack1", quantity: 10 }),
				}),
			);
		});
		expect(await screen.findByText("Тара добавлена")).toBeTruthy();
		expect(screen.queryByLabelText("Вид тары")).toBeNull();

		fireEvent.click(await screen.findByRole("button", { name: /Сырье.*12.5 кг.*1 видов/ }));
		expect(await screen.findByRole("heading", { name: "Сырье" })).toBeTruthy();
		expect(screen.getByText("12.5 кг")).toBeTruthy();
		expect(screen.queryByText("Икра осетр")).toBeNull();
		expect(screen.queryByLabelText("Вид сырья")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Назад" }));

		fireEvent.click(screen.getByRole("button", { name: /Тара.*8 шт.*1 видов/ }));
		expect(await screen.findByRole("heading", { name: "Тара" })).toBeTruthy();
		expect(screen.getByText("8 шт")).toBeTruthy();
		expect(screen.queryByText("Коробка")).toBeNull();
		expect(screen.queryByLabelText("Вид тары")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Назад" }));

		fireEvent.click(screen.getByRole("button", { name: "Продукция 4 шт" }));
		expect(await screen.findByRole("heading", { name: "Продукция в цеху" })).toBeTruthy();
		expect(screen.getByText("Икра горбуши")).toBeTruthy();
		expect(screen.getByText("Количество")).toBeTruthy();
		expect(screen.getByText("Цена")).toBeTruthy();
		expect(screen.getByText("4 шт")).toBeTruthy();
		expect(screen.getByText("из 4 шт")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Назад" }));

		fireEvent.click(screen.getByRole("button", { name: "Выпустить" }));
		expect(await screen.findByRole("button", { name: "Назад" })).toBeTruthy();
		expect(screen.queryByText("Приход и выпуск")).toBeNull();
		expect(screen.queryByRole("button", { name: "Сырье" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Тара" })).toBeNull();
		fireEvent.change(await screen.findByLabelText("Шаблон продукции"), { target: { value: "template1" } });
		expect(screen.getByText((_, element) =>
			element?.className === "muted"
			&& (element.textContent?.includes("Доступно: 12.5 кг сырья · 8 шт тары") ?? false),
		)).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Количество продукции, шт"), { target: { value: "9" } });
		expect(screen.getByText("Не хватает тары: нужно 9 шт, доступно 8 шт.")).toBeTruthy();
		expect((screen.getByRole("button", { name: "Выпустить" }) as HTMLButtonElement).disabled).toBe(true);
		const callsBeforeBlockedRelease = fetchMock.mock.calls.length;
		fireEvent.click(screen.getByRole("button", { name: "Выпустить" }));
		expect(fetchMock).toHaveBeenCalledTimes(callsBeforeBlockedRelease);
		fireEvent.change(screen.getByLabelText("Количество продукции, шт"), { target: { value: "4" } });
		expect(screen.queryByText("Не хватает тары: нужно 9 шт, доступно 8 шт.")).toBeNull();
		fireEvent.change(screen.getByLabelText("Расход сырья, кг"), { target: { value: "6.25" } });
		fireEvent.click(screen.getByRole("button", { name: "Выпустить" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/production/product-batches"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						productTemplateId: "template1",
						quantity: 4,
						consumedRawMaterialQuantity: 6.25,
					}),
				}),
			);
		});

		expect(await screen.findByText("Выпуск записан")).toBeTruthy();
		expect(screen.queryByLabelText("Шаблон продукции")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Передать" }));
		expect(await screen.findByRole("heading", { name: "На распределитель" })).toBeTruthy();
		fireEvent.change(await screen.findByLabelText("Продукция"), { target: { value: "batch1" } });
		fireEvent.change(screen.getByRole("combobox", { name: "Распределитель" }), { target: { value: "dist1" } });
		fireEvent.change(screen.getByLabelText("Количество, шт"), { target: { value: "2" } });
		fireEvent.change(screen.getByLabelText("Комментарий"), { target: { value: "На Центральный" } });
		fireEvent.click(screen.getByRole("button", { name: "Переместить" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/production/product-transfers"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						productBatchId: "batch1",
						distributorId: "dist1",
						quantity: 2,
						comment: "На Центральный",
					}),
				}),
			);
		});

		expect(await screen.findByText("Перемещено на распределитель")).toBeTruthy();
		expect(screen.queryByLabelText("Количество, шт")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Распределитель" }));
		expect(await screen.findByRole("heading", { name: "На распределителе" })).toBeTruthy();
		expect(screen.queryByText("Товар на распределителе")).toBeNull();
		expect(screen.queryByText((_, element) => element?.textContent === "Товарный баланс 2500.00 ₽")).toBeNull();
		expect(screen.getByText("Стоимость")).toBeTruthy();
		expect(await screen.findByText("Икра горбуши")).toBeTruthy();
		expect(screen.getAllByText("2 шт").length).toBeGreaterThan(0);
	});

	it("keeps production backend errors inline without success notice", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(productionActorResponse);
			}

			if (url.endsWith("/production/summary")) {
				return jsonResponse({
					summary: {
						readyProductUnits: 0,
						rawMaterialKinds: 1,
						rawMaterialTotal: 12.5,
						rawMaterialUnit: "кг",
						packagingKinds: 1,
						packagingTotal: 8,
						packagingUnit: "шт",
					},
				});
			}

			if (url.endsWith("/production/raw-material-balances")) {
				return jsonResponse({
					rawMaterialBalances: [{
						id: "raw-balance1",
						typeId: "raw1",
						name: "Горбуша",
						unit: "кг",
						quantity: 12.5,
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/production/packaging-balances")) {
				return jsonResponse({
					packagingBalances: [{
						id: "pack-balance1",
						typeId: "pack1",
						name: "Банка",
						unit: "шт",
						quantity: 8,
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			if (url.endsWith("/production/workshop-product-balances")) {
				return jsonResponse({ workshopProductBalances: [] });
			}

			if (url.endsWith("/production/transfer-options")) {
				return jsonResponse({ distributors: [], workshopProductBalances: [] });
			}

			if (url.endsWith("/production/product-batches") && method === "POST") {
				return jsonResponse({ error: { message: "Недостаточно сырья" } }, 400);
			}

			if (url.endsWith("/production/product-batches")) {
				return jsonResponse({ productBatches: [] });
			}

			if (url.endsWith("/production/options")) {
				return jsonResponse({
					rawMaterialTypes: [{
						id: "raw1",
						name: "Горбуша",
						unit: "кг",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
					packagingTypes: [{
						id: "pack1",
						name: "Банка",
						unit: "шт",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
					productTemplates: [{
						id: "template1",
						name: "Икра горбуши",
						rawMaterialTypeId: "raw1",
						rawMaterialType: {
							id: "raw1",
							name: "Горбуша",
							unit: "кг",
							active: true,
							createdAt: new Date(0).toISOString(),
							updatedAt: new Date(0).toISOString(),
						},
						packagingTypeId: "pack1",
						packagingType: {
							id: "pack1",
							name: "Банка",
							unit: "шт",
							active: true,
							createdAt: new Date(0).toISOString(),
							updatedAt: new Date(0).toISOString(),
						},
						priceCents: 125000,
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					}],
				});
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Выпустить" }));
		fireEvent.change(await screen.findByLabelText("Шаблон продукции"), { target: { value: "template1" } });
		fireEvent.change(screen.getByLabelText("Количество продукции, шт"), { target: { value: "4" } });
		fireEvent.change(screen.getByLabelText("Расход сырья, кг"), { target: { value: "6.25" } });
		fireEvent.click(screen.getByRole("button", { name: "Выпустить" }));

		expect(await screen.findByText("Недостаточно сырья")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Выпуск продукции" })).toBeTruthy();
		expect(screen.queryByText("Выпуск записан")).toBeNull();
	});

	it("renders commercial manager home and navigates through sale action and bottom nav", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(commercialActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.endsWith("/distributor/sale-options")) {
				return jsonResponse(distributorSaleOptionsResponse);
			}

			if (url.includes("/clients")) {
				return jsonResponse(clientsResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByRole("heading", { name: "Продажи" })).toBeTruthy();
		expect(screen.getByText("Остаток распределителя")).toBeTruthy();
		expect(screen.getByText("Стоимость")).toBeTruthy();
		expect(screen.getByText("Позиций")).toBeTruthy();
		expect(screen.queryByText("Можно продавать")).toBeNull();
		expect(await screen.findByText("Наличные")).toBeTruthy();
		expect(screen.getByText((_, element) =>
			element?.textContent?.replace(/\u00A0/g, " ") === "2500.00 ₽",
		)).toBeTruthy();
		expect(screen.getByText((_, element) =>
			element?.textContent?.replace(/\u00A0/g, " ") === "1250.00 ₽",
		)).toBeTruthy();
		const saleAction = screen.getByRole("button", { name: "Открыть продажу" });
		expect(saleAction.className).toContain("action-tile");
		expect(screen.queryByRole("heading", { name: "Действия" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Показать остатки" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Открыть клиентов" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Открыть курьеров" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Продажа" })).toBeNull();
		expect(screen.queryByText("Икра горбуши")).toBeNull();
		expect(screen.queryByText("Распределитель Центральный")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Остатки" }));
		expect(await screen.findByRole("heading", { name: "Остатки" })).toBeTruthy();
		expect(screen.getByText("Икра горбуши")).toBeTruthy();
		expect(screen.getByText("Распределитель Центральный")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Главная" }));
		expect(await screen.findByRole("heading", { name: "Продажи" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Открыть продажу" }));
		expect(await screen.findByRole("heading", { name: "Продажа" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Главная" }));
		expect(await screen.findByRole("heading", { name: "Продажи" })).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Клиенты" }));
		expect(await screen.findByText("1 клиентов")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Главная" }));
		expect(await screen.findByRole("heading", { name: "Продажи" })).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Курьеры" }));
		expect(await screen.findByText("Балансы курьеров")).toBeTruthy();
	});

	it("renders distributor worker home without non-action tiles or courier management", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(distributorWorkerActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.endsWith("/distributor/sale-options")) {
				return jsonResponse(distributorSaleOptionsResponse);
			}

			if (url.includes("/clients")) {
				return jsonResponse(clientsResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByRole("heading", { name: "Распределитель" })).toBeTruthy();
		expect(screen.getByText("Стоимость")).toBeTruthy();
		expect(await screen.findByText("Наличные")).toBeTruthy();
		expect(screen.queryByText("Товар")).toBeNull();
		expect(screen.queryByText("Позиций")).toBeNull();
		const saleAction = screen.getByRole("button", { name: "Открыть продажу" });
		expect(saleAction.className).toContain("action-tile");
		expect(screen.queryByRole("heading", { name: "Действия" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Показать остатки" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Открыть клиентов" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Курьеры" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Продажа" })).toBeNull();
		expect(screen.queryByText("Балансы курьеров")).toBeNull();
		expect(screen.getByRole("heading", { name: "Продукция" })).toBeTruthy();
		expect(screen.getByText("Количество")).toBeTruthy();
		expect(screen.getByText("Икра горбуши")).toBeTruthy();
		expect(screen.getByText("Распределитель Центральный")).toBeTruthy();

		fireEvent.click(saleAction);
		expect(await screen.findByRole("heading", { name: "Продажа" })).toBeTruthy();
		expect(screen.queryByText("Балансы курьеров")).toBeNull();
	});

	it("lets courier load product to own balance", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(courierActorResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			if (url.endsWith("/courier/load-options")) {
				return jsonResponse(courierLoadOptionsResponse);
			}

			if (url.endsWith("/courier/loads") && method === "POST") {
				return jsonResponse({
					load: {
						id: "load1",
						courierUserId: "seed-courier",
						distributorProductBalanceId: "distributor-balance1",
						distributorId: "dist1",
						productBatchId: "batch1",
						quantity: 1,
						comment: "На доставку",
						operationId: "op1",
						actorUserId: "seed-courier",
						createdAt: new Date(0).toISOString(),
					},
					distributorProductBalance: {
						...distributorInventoryResponse.items[0],
						quantity: 1,
						stockValueCents: 125000,
					},
					courierProductBalance: {
						...courierProductBalancesResponse.items[0],
						quantity: 3,
						stockValueCents: 375000,
					},
				});
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByRole("heading", { name: "Мой баланс" })).toBeTruthy();
		expect(screen.getByText("Стоимость")).toBeTruthy();
		expect(await screen.findByText("Наличные")).toBeTruthy();
		expect(screen.getByText("700.00 ₽")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Продукция" })).toBeTruthy();
		expect(screen.getByText("Количество")).toBeTruthy();
		expect(await screen.findByText("Икра горбуши")).toBeTruthy();
		expect(screen.queryByText("У курьера")).toBeNull();
		const loadAction = screen.getByRole("button", { name: "Открыть загрузку" });
		expect(loadAction.className).toContain("action-tile");
		expect(screen.getByRole("button", { name: "Открыть продажу" }).className).toContain("action-tile");
		expect(screen.queryByRole("button", { name: "Загрузка" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Продажа" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Сгрузить" })).toBeNull();
		fireEvent.click(loadAction);
		expect(await screen.findByRole("heading", { name: "Детали загрузки" })).toBeTruthy();
		await selectOperationProduct(/Икра горбуши/);
		fireEvent.change(screen.getByLabelText("Количество, шт"), { target: { value: "1" } });
		fireEvent.change(screen.getByLabelText("Комментарий"), { target: { value: "На доставку" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать загрузку" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/courier/loads"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						distributorProductBalanceId: "distributor-balance1",
						quantity: 1,
						comment: "На доставку",
					}),
				}),
			);
		});
		expect(await screen.findByText("Загрузка записана")).toBeTruthy();
	});

	it("keeps courier load form state when backend rejects the load", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(courierActorResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			if (url.endsWith("/courier/load-options")) {
				return jsonResponse(courierLoadOptionsResponse);
			}

			if (url.endsWith("/courier/loads") && method === "POST") {
				return jsonResponse({ error: { message: "Недостаточно товара на распределителе" } }, 400);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Открыть загрузку" }));
		await selectOperationProduct(/Икра горбуши/);
		fireEvent.change(screen.getByLabelText("Количество, шт"), { target: { value: "1" } });
		fireEvent.change(screen.getByLabelText("Комментарий"), { target: { value: "На доставку" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать загрузку" }));

		expect(await screen.findByText("Недостаточно товара на распределителе")).toBeTruthy();
		expect((screen.getByRole("combobox", { name: "Продукция" }) as HTMLInputElement).value).toContain("Икра горбуши");
		expect((screen.getByLabelText("Количество, шт") as HTMLInputElement).value).toBe("1");
		expect((screen.getByLabelText("Комментарий") as HTMLTextAreaElement).value).toBe("На доставку");
		expect(screen.queryByText("Загрузка записана")).toBeNull();
		expect(screen.getByRole("heading", { name: "Детали загрузки" })).toBeTruthy();
	});

	it("lets courier sell product from own balance", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(courierActorResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			if (url.endsWith("/courier/sale-options")) {
				return jsonResponse(courierSaleOptionsResponse);
			}

			if (url.endsWith("/courier/sales") && method === "POST") {
				return jsonResponse({
					sale: {
						id: "courier-sale1",
						courierProductBalanceId: "courier-balance1",
						courierUserId: "seed-courier",
						productBatchId: "batch1",
						clientId: "client1",
						quantity: 1,
						unitPriceCents: 125000,
						totalCents: 125000,
						paymentMethod: "cashless",
						comment: "Доставка",
						operationId: "op1",
						actorUserId: "seed-courier",
						createdAt: new Date(0).toISOString(),
					},
					courierProductBalance: {
						...courierProductBalancesResponse.items[0],
						quantity: 1,
						stockValueCents: 125000,
					},
					cashBalance: {
						...courierCashBalancesResponse.items[0],
						amountCents: 195000,
						updatedAt: new Date(1).toISOString(),
					},
				});
			}

			if (url.includes("/clients")) {
				return jsonResponse(clientsResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);
		const requestCount = (path: string) =>
			fetchMock.mock.calls.filter(([input]) => String(input).endsWith(path)).length;

		render(<HomePage />);

		expect(await screen.findByRole("heading", { name: "Мой баланс" })).toBeTruthy();
		fireEvent.click(await screen.findByRole("button", { name: "Открыть продажу" }));
		expect(await screen.findByRole("heading", { name: "Продажа" })).toBeTruthy();
		fireEvent.change(await screen.findByLabelText("Клиент"), { target: { value: "Иван" } });
		fireEvent.click(await screen.findByRole("button", { name: "Выбрать клиента Иван Петров" }));
		expect(screen.queryByText("Поиск клиента")).toBeNull();
		expect(screen.queryByRole("button", { name: "Новый клиент" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Очистить клиента" }));
		expect(await screen.findByLabelText("Клиент")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Новый клиент" })).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Клиент"), { target: { value: "Иван" } });
		fireEvent.click(await screen.findByRole("button", { name: "Выбрать клиента Иван Петров" }));
		await selectOperationProduct(/Икра горбуши/);
		fireEvent.change(screen.getByLabelText("Количество, шт"), { target: { value: "1" } });
		fireEvent.click(screen.getByRole("button", { name: "Безнал" }));
		expect(screen.getByRole("button", { name: "Безнал" }).getAttribute("aria-pressed")).toBe("true");
		expect(screen.queryByText("Наличные не изменятся")).toBeNull();
		expect(screen.queryByText("Наличные увеличатся у курьера")).toBeNull();
		fireEvent.change(screen.getByLabelText("Комментарий"), { target: { value: "Доставка" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать продажу" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/courier/sales"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						courierProductBalanceId: "courier-balance1",
						clientId: "client1",
						quantity: 1,
						paymentMethod: "cashless",
						comment: "Доставка",
					}),
				}),
			);
		});
		expect(await screen.findByText("Продажа записана")).toBeTruthy();
		await waitFor(() => {
			expect(screen.getAllByText("Мой баланс").length).toBeGreaterThan(0);
		});
		await waitFor(() => {
			expect(requestCount("/courier/product-balances")).toBeGreaterThan(1);
			expect(requestCount("/courier/sale-options")).toBeGreaterThan(1);
			expect(requestCount("/courier/cash-balances")).toBeGreaterThan(1);
		});
	});

	it("keeps courier sale form state when backend rejects the sale", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(courierActorResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			if (url.endsWith("/courier/sale-options")) {
				return jsonResponse(courierSaleOptionsResponse);
			}

			if (url.endsWith("/courier/sales") && method === "POST") {
				return jsonResponse({ error: { message: "Недостаточно товара у курьера" } }, 400);
			}

			if (url.includes("/clients")) {
				return jsonResponse(clientsResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Открыть продажу" }));
		fireEvent.change(await screen.findByLabelText("Клиент"), { target: { value: "Иван" } });
		fireEvent.click(await screen.findByRole("button", { name: "Выбрать клиента Иван Петров" }));
		await selectOperationProduct(/Икра горбуши/);
		fireEvent.change(screen.getByLabelText("Количество, шт"), { target: { value: "1" } });
		fireEvent.click(screen.getByRole("button", { name: "Безнал" }));
		fireEvent.change(screen.getByLabelText("Комментарий"), { target: { value: "Доставка" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать продажу" }));

		expect(await screen.findByText("Недостаточно товара у курьера")).toBeTruthy();
		expect((screen.getByLabelText("Клиент") as HTMLInputElement).value).toBe("Иван Петров");
		expect((screen.getByRole("combobox", { name: "Продукция" }) as HTMLInputElement).value).toContain("Икра горбуши");
		expect((screen.getByLabelText("Количество, шт") as HTMLInputElement).value).toBe("1");
		expect(screen.getByRole("button", { name: "Безнал" }).getAttribute("aria-pressed")).toBe("true");
		expect((screen.getByLabelText("Комментарий") as HTMLTextAreaElement).value).toBe("Доставка");
		expect(screen.queryByText("Продажа записана")).toBeNull();
		expect(screen.getByRole("heading", { name: "Детали продажи" })).toBeTruthy();
	});

	it("shows courier balances read-only to commercial manager", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(commercialActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Курьеры" }));
		expect(await screen.findByText("Балансы курьеров")).toBeTruthy();
		expect(screen.getByText("Стоимость")).toBeTruthy();
		expect(screen.getAllByText("Наличные").length).toBeGreaterThan(0);
		expect(await screen.findByText("Courier")).toBeTruthy();
		expect(screen.getAllByText("1 позиций").length).toBeGreaterThan(0);
		expect(screen.getByText("Икра горбуши")).toBeTruthy();
		expect(screen.getByText("Итого товаром")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Записать загрузку" })).toBeNull();
	});

	it("shows courier balances read-only to director", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(directorActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Курьеры" }));
		expect(await screen.findByText("Балансы курьеров")).toBeTruthy();
		expect(screen.getByText("Стоимость")).toBeTruthy();
		expect(await screen.findByText("Courier")).toBeTruthy();
		expect(screen.getAllByText("1 позиций").length).toBeGreaterThan(0);
		expect(screen.getByText("Итого товаром")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Записать загрузку" })).toBeNull();
	});

	it("shows director overview as a compact summary and keeps details in tabs", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (method !== "GET") {
				return jsonResponse({ error: { message: "Unexpected mutation" } }, 500);
			}

			if (url.endsWith("/auth/me")) {
				return jsonResponse(directorActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.endsWith("/courier/product-balances")) {
				return jsonResponse(courierProductBalancesResponse);
			}

			if (url.endsWith("/courier/cash-balances")) {
				return jsonResponse(courierCashBalancesResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByRole("heading", { name: "Контроль" })).toBeTruthy();
		expect(screen.getByText("В обороте")).toBeTruthy();
		expect(await screen.findByText("4 шт")).toBeTruthy();
		expect(screen.getAllByText("Наличные").length).toBeGreaterThan(0);
		expect(await screen.findByText("1950.00 ₽")).toBeTruthy();
		expect(screen.getAllByText("Распределитель").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Курьеры").length).toBeGreaterThan(0);
		expect(screen.queryByText("Икра горбуши")).toBeNull();
		expect(screen.queryByText("Courier")).toBeNull();
		expect(screen.queryByText("Courier · @courier")).toBeNull();
		expect(screen.queryByText("Последние операции")).toBeNull();
		expect(screen.queryByText("Продажи сегодня")).toBeNull();
		expect(screen.queryByText("Статистика")).toBeNull();
		expect(screen.queryByRole("button", { name: "Продажа" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Назначить дисконт пока недоступно" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Распределитель" }));
		expect(await screen.findByRole("heading", { name: "Распределитель" })).toBeTruthy();
		expect(await screen.findByText("Икра горбуши")).toBeTruthy();

		expect(fetchMock.mock.calls.every(([, init]) => (init?.method ?? "GET") === "GET")).toBe(true);
	});

	it("lets a commercial manager create a client inside distributor sale and records sale", async () => {
		let clients = [...clientsResponse.clients];
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(commercialActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.endsWith("/distributor/sale-options")) {
				return jsonResponse(distributorSaleOptionsResponse);
			}

			if (url.endsWith("/distributor/sales") && method === "POST") {
				return jsonResponse({
					sale: {
						id: "sale1",
						distributorProductBalanceId: "distributor-balance1",
						distributorId: "dist1",
						productBatchId: "batch1",
						clientId: "client2",
						quantity: 1,
						unitPriceCents: 125000,
						totalCents: 125000,
						paymentMethod: "cash",
						comment: "Первый заказ",
						operationId: "op1",
						actorUserId: "seed-commercial-manager",
						createdAt: new Date(0).toISOString(),
					},
					distributorProductBalance: {
						...distributorInventoryResponse.items[0],
						quantity: 1,
						stockValueCents: 125000,
					},
					cashBalance: {
						distributorId: "dist1",
						distributorName: "Распределитель Центральный",
						amountCents: 250000,
						updatedAt: new Date(1).toISOString(),
					},
				});
			}

			if (url.includes("/clients") && method === "POST") {
				const body = JSON.parse(String(init?.body)) as { name: string; phone: string; description?: string };
				const created = {
					id: "client2",
					name: body.name,
					phone: body.phone,
					phoneNormalized: "79998887766",
					description: body.description ?? null,
					createdByUserId: "seed-commercial-manager",
					createdAt: new Date(0).toISOString(),
					updatedAt: new Date(0).toISOString(),
				};
				clients = [...clients, created];
				return jsonResponse({ client: created });
			}

			if (url.includes("/clients")) {
				return jsonResponse({ clients });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Открыть продажу" }));
		expect(await screen.findByRole("heading", { name: "Продажа" })).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Новый клиент" }));
		fireEvent.change(await screen.findByLabelText("Имя нового клиента"), { target: { value: "Анна" } });
		fireEvent.change(screen.getByLabelText("Телефон нового клиента"), { target: { value: "+7 (999) 888-77-66" } });
		fireEvent.click(screen.getByRole("button", { name: "Создать клиента" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/clients"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						name: "Анна",
						phone: "+7 (999) 888-77-66",
						description: "",
					}),
				}),
			);
		});

		await waitFor(() => {
			expect(screen.queryByText("Поиск клиента")).toBeNull();
			expect(screen.queryByRole("button", { name: "Новый клиент" })).toBeNull();
			expect(screen.getByRole("button", { name: "Очистить клиента" })).toBeTruthy();
		});
		await selectOperationProduct(/Икра горбуши/);
		expect(screen.getByText((_, element) =>
			element?.textContent === "Доступно: 2 шт · 1250.00 ₽/шт",
		)).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Количество, шт"), { target: { value: "1" } });
		fireEvent.change(screen.getByLabelText("Способ оплаты"), { target: { value: "cash" } });
		fireEvent.change(screen.getByLabelText("Комментарий"), { target: { value: "Первый заказ" } });
		fireEvent.click(screen.getByRole("button", { name: "Записать продажу" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/distributor/sales"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						distributorProductBalanceId: "distributor-balance1",
						clientId: "client2",
						quantity: 1,
						paymentMethod: "cash",
						comment: "Первый заказ",
					}),
				}),
			);
		});
		expect(await screen.findByText("Продажа записана")).toBeTruthy();
		expect(await screen.findByRole("heading", { name: "Продажи" })).toBeTruthy();
		expect(await screen.findByText("Остаток распределителя")).toBeTruthy();
		expect(screen.queryByText("Детали продажи")).toBeNull();
	});

	it("lets a commercial manager create and edit clients", async () => {
		let clients = [...clientsResponse.clients];
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(commercialActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.includes("/clients") && method === "POST") {
				const body = JSON.parse(String(init?.body)) as { name: string; phone: string; description?: string };
				const created = {
					id: "client2",
					name: body.name,
					phone: body.phone,
					phoneNormalized: "79998887766",
					description: body.description ?? null,
					createdByUserId: "seed-commercial-manager",
					createdAt: new Date(0).toISOString(),
					updatedAt: new Date(0).toISOString(),
				};
				clients = [...clients, created];
				return jsonResponse({ client: created });
			}

			if (url.endsWith("/clients/client1") && method === "PATCH") {
				const body = JSON.parse(String(init?.body)) as { name: string; phone: string; description?: string };
				const updated = {
					...clients[0]!,
					name: body.name,
					phone: body.phone,
					phoneNormalized: "79991112233",
					description: body.description || null,
					updatedAt: new Date(1).toISOString(),
				};
				clients = [updated, ...clients.slice(1)];
				return jsonResponse({ client: updated });
			}

			if (url.includes("/clients")) {
				return jsonResponse({ clients });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Клиенты" }));
		expect(await screen.findByText("Иван Петров")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Добавить клиента" }));
		fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Анна" } });
		fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+7 (999) 888-77-66" } });
		fireEvent.change(screen.getByLabelText("Описание"), { target: { value: "Новый клиент" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/clients"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						name: "Анна",
						phone: "+7 (999) 888-77-66",
						description: "Новый клиент",
					}),
				}),
			);
		});
		expect(await screen.findByText("Клиент добавлен")).toBeTruthy();
		expect(screen.queryByLabelText("Имя")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Редактировать Иван Петров" }));
		fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Иван Новый" } });
		fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+7 (999) 111-22-33" } });
		fireEvent.change(screen.getByLabelText("Описание"), { target: { value: "" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/clients/client1"),
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({
						name: "Иван Новый",
						phone: "+7 (999) 111-22-33",
						description: "",
					}),
				}),
			);
		});
		expect(await screen.findByText("Клиент обновлен")).toBeTruthy();
	});

	it("shows clients read-only for a director and hides clients for production manager", async () => {
		const directorFetch = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(directorActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.includes("/clients")) {
				return jsonResponse(clientsResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", directorFetch);
		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Клиенты" }));
		expect(await screen.findByText("Иван Петров")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Добавить клиента" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Редактировать Иван Петров" })).toBeNull();

		cleanup();
		vi.unstubAllGlobals();

		const productionFetch = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(productionActorResponse);
			}

			if (url.endsWith("/production/summary")) {
				return jsonResponse({
					summary: {
						readyProductUnits: 0,
						rawMaterialKinds: 0,
						rawMaterialTotal: 0,
						rawMaterialUnit: "кг",
						packagingKinds: 0,
						packagingTotal: 0,
						packagingUnit: "шт",
					},
				});
			}

			if (url.endsWith("/production/raw-material-balances")) {
				return jsonResponse({ rawMaterialBalances: [] });
			}

			if (url.endsWith("/production/packaging-balances")) {
				return jsonResponse({ packagingBalances: [] });
			}

			if (url.endsWith("/production/workshop-product-balances")) {
				return jsonResponse({ workshopProductBalances: [] });
			}

			if (url.endsWith("/production/transfer-options")) {
				return jsonResponse({ distributors: [], workshopProductBalances: [] });
			}

			if (url.endsWith("/production/product-batches")) {
				return jsonResponse({ productBatches: [] });
			}

			if (url.endsWith("/production/options")) {
				return jsonResponse({ rawMaterialTypes: [], packagingTypes: [], productTemplates: [] });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", productionFetch);
		render(<HomePage />);

		expect(await screen.findByText("Заведующий производством")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Клиенты" })).toBeNull();
	});

	it("keeps client backend errors inline and disables writes offline", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(commercialActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.includes("/clients") && method === "POST") {
				return jsonResponse({ error: { message: "Клиент с таким телефоном уже существует" } }, 409);
			}

			if (url.includes("/clients")) {
				return jsonResponse({ clients: [] });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Клиенты" }));
		fireEvent.click(await screen.findByRole("button", { name: "Добавить клиента" }));
		fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Иван" } });
		fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+7 (999) 123-45-67" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

		expect(await screen.findByText("Клиент с таким телефоном уже существует")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Добавить клиента" })).toBeTruthy();
		expect(screen.queryByText("Клиент добавлен")).toBeNull();

		cleanup();
		vi.unstubAllGlobals();
		Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
		vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(commercialActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			if (url.endsWith("/distributor/cash-balances")) {
				return jsonResponse(distributorCashBalancesResponse);
			}

			if (url.includes("/clients")) {
				return jsonResponse({ clients: [] });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		}));

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Клиенты" }));
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Добавить клиента" }).hasAttribute("disabled")).toBe(true);
		});
		Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
	});
});
