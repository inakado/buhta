import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const adminActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-admin",
		login: "admin",
		displayName: "Admin",
		role: "admin",
		permissions: ["users.manage", "catalog.manage"],
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
		permissions: ["distributor.stock.read", "distributor.sale.create"],
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

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
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

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByText("Продукция в цеху")).toBeTruthy();
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

		fireEvent.click(await screen.findByRole("button", { name: /Сырье 1 видов/ }));
		expect(await screen.findByRole("heading", { name: "Сырье" })).toBeTruthy();
		expect(screen.getByText("12.5 кг")).toBeTruthy();
		expect(screen.queryByText("Икра осетр")).toBeNull();
		expect(screen.queryByLabelText("Вид сырья")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Назад" }));

		fireEvent.click(screen.getByRole("button", { name: /Тара 1 видов/ }));
		expect(await screen.findByRole("heading", { name: "Тара" })).toBeTruthy();
		expect(screen.getByText("8 шт")).toBeTruthy();
		expect(screen.queryByText("Коробка")).toBeNull();
		expect(screen.queryByLabelText("Вид тары")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Назад" }));

		fireEvent.click(screen.getByRole("button", { name: /Продукция в цеху/ }));
		expect(await screen.findByRole("heading", { name: "Продукция в цеху" })).toBeTruthy();
		expect(screen.getByText("Икра горбуши")).toBeTruthy();
		expect(screen.getByText("Доступно 4 из 4 шт")).toBeTruthy();
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
		fireEvent.change(screen.getByLabelText("Количество продукции, шт"), { target: { value: "4" } });
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
		fireEvent.click(screen.getByRole("button", { name: "На распределитель" }));
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
		expect(await screen.findByText("Товар на распределителе")).toBeTruthy();
		expect(await screen.findByText((_, element) => element?.textContent === "Товарный баланс 2500.00 ₽")).toBeTruthy();
		expect(screen.getAllByText("2 шт").length).toBeGreaterThan(0);
		expect(screen.getByText("Икра горбуши")).toBeTruthy();
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

	it("renders distributor inventory on commercial manager home", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(commercialActorResponse);
			}

			if (url.endsWith("/distributor/inventory")) {
				return jsonResponse(distributorInventoryResponse);
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		expect(await screen.findByText("Товар на распределителе")).toBeTruthy();
		expect(await screen.findByText((_, element) => element?.textContent === "Товарный баланс 2500.00 ₽")).toBeTruthy();
		expect(screen.getByText("Икра горбуши")).toBeTruthy();
		expect(screen.getByText("Распределитель Центральный")).toBeTruthy();
	});
});
