import { describe, expect, it, vi } from "vitest";
import { CourierController } from "../src/courier/courier.controller";
import type { CourierService } from "../src/courier/courier.service";
import type { Actor } from "../src/policy/actor";

const actor: Actor = {
	userId: "courier1",
	login: "courier",
	displayName: "Courier",
	role: "courier",
	permissions: [
		"courier.stock.read",
		"courier.stock.load",
		"courier.cash.read",
		"courier.sale.create",
		"courier.sale.cancel",
		"courier.unload.create",
	],
};
const idempotencyKey = "controller-test-key";

describe("CourierController", () => {
	it("returns courier load options from service", async () => {
		const loadOptions = {
			items: [{
				distributorProductBalanceId: "balance1",
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
		const courierService = {
			getLoadOptions: vi.fn().mockResolvedValue(loadOptions),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(controller.loadOptions()).resolves.toEqual(loadOptions);
		expect(courierService.getLoadOptions).toHaveBeenCalledWith();
	});

	it("returns courier product balances through service", async () => {
		const balances = {
			summary: {
				courierCount: 1,
				stockItemCount: 1,
				totalUnits: 2,
				totalStockValueCents: 250000,
			},
			courierSummaries: [{
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				stockItemCount: 1,
				totalUnits: 2,
				totalStockValueCents: 250000,
			}],
			items: [],
		};
		const courierService = {
			getProductBalances: vi.fn().mockResolvedValue(balances),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(controller.productBalances(actor)).resolves.toEqual(balances);
		expect(courierService.getProductBalances).toHaveBeenCalledWith(actor);
	});

	it("validates and creates courier load through service", async () => {
		const response = {
			load: {
				id: "load1",
				courierUserId: "courier1",
				distributorProductBalanceId: "balance1",
				distributorId: "dist1",
				productBatchId: "batch1",
				quantity: 2,
				comment: null,
				operationId: "op1",
				actorUserId: "courier1",
				createdAt: new Date(0).toISOString(),
			},
			distributorProductBalance: {
				id: "balance1",
				distributorId: "dist1",
				distributorName: "Распределитель Центральный",
				productBatchId: "batch1",
				productName: "Икра горбуши",
				priceCents: 125000,
				quantity: 0,
				stockValueCents: 0,
				updatedAt: new Date(0).toISOString(),
			},
			courierProductBalance: {
				id: "courier-balance1",
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				productBatchId: "batch1",
				productName: "Икра горбуши",
				unitPriceCents: 125000,
				quantity: 2,
				stockValueCents: 250000,
				updatedAt: new Date(0).toISOString(),
			},
		};
		const courierService = {
			createCourierLoad: vi.fn().mockResolvedValue(response),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(
				controller.createLoad(actor, {
					distributorProductBalanceId: "balance1",
					quantity: 2,
				}, idempotencyKey),
			).resolves.toEqual(response);
			expect(courierService.createCourierLoad).toHaveBeenCalledWith(actor, {
				distributorProductBalanceId: "balance1",
				quantity: 2,
			}, idempotencyKey);
			await expect(
				controller.createLoad(actor, {
					distributorProductBalanceId: "balance1",
					quantity: 0,
				}, idempotencyKey),
			).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("returns courier sale options and cash balances through service", async () => {
		const saleOptions = {
			items: [{
				courierProductBalanceId: "courier-balance1",
				courierUserId: "courier1",
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
		const cashBalances = {
			totalAmountCents: 0,
			courierCount: 1,
			items: [{
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				amountCents: 0,
				updatedAt: null,
			}],
		};
		const courierService = {
			getSaleOptions: vi.fn().mockResolvedValue(saleOptions),
			getCashBalances: vi.fn().mockResolvedValue(cashBalances),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(controller.saleOptions(actor)).resolves.toEqual(saleOptions);
		await expect(controller.cashBalances(actor)).resolves.toEqual(cashBalances);
		expect(courierService.getSaleOptions).toHaveBeenCalledWith(actor);
		expect(courierService.getCashBalances).toHaveBeenCalledWith(actor);
	});

	it("validates and creates courier sale through service", async () => {
		const response = {
			sale: {
				id: "sale1",
				courierProductBalanceId: "courier-balance1",
				courierUserId: "courier1",
				productBatchId: "batch1",
				clientId: "client1",
				quantity: 2,
				unitPriceCents: 125000,
				totalCents: 250000,
				paymentMethod: "cash",
				comment: null,
				operationId: "op1",
				actorUserId: "courier1",
				createdAt: new Date(0).toISOString(),
			},
			courierProductBalance: {
				id: "courier-balance1",
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				productBatchId: "batch1",
				productName: "Икра горбуши",
				unitPriceCents: 125000,
				quantity: 0,
				stockValueCents: 0,
				updatedAt: new Date(0).toISOString(),
			},
			cashBalance: {
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				amountCents: 250000,
				updatedAt: new Date(0).toISOString(),
			},
		};
		const courierService = {
			createCourierSale: vi.fn().mockResolvedValue(response),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(
				controller.createSale(actor, {
					courierProductBalanceId: "courier-balance1",
					clientId: "client1",
					quantity: 2,
					paymentMethod: "cash",
				}, idempotencyKey),
			).resolves.toEqual(response);
			expect(courierService.createCourierSale).toHaveBeenCalledWith(actor, {
				courierProductBalanceId: "courier-balance1",
				clientId: "client1",
				quantity: 2,
				paymentMethod: "cash",
			}, idempotencyKey);
			await expect(
				controller.createSale(actor, {
					courierProductBalanceId: "courier-balance1",
					clientId: "client1",
					quantity: 0,
					paymentMethod: "cash",
				}, idempotencyKey),
			).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("returns courier sales history and validates cancellation through service", async () => {
		const recentSales = { items: [] };
		const history = { items: [], nextCursor: null };
		const cancelResponse = {
			cancellation: {
				id: "cancel1",
				courierSaleId: "sale1",
				courierProductBalanceId: "courier-balance1",
				courierUserId: "courier1",
				productBatchId: "batch1",
				clientId: "client1",
				quantity: 2,
				baseUnitPriceCents: 125000,
				unitPriceCents: 125000,
				discountCentsPerUnit: 0,
				discountTotalCents: 0,
				totalCents: 250000,
				paymentMethod: "cash" as const,
				reason: "Ошибка клиента",
				operationId: "op2",
				actorUserId: "courier1",
				createdAt: new Date(1).toISOString(),
			},
			courierProductBalance: {
				id: "courier-balance1",
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				productBatchId: "batch1",
				productName: "Икра горбуши",
				baseUnitPriceCents: 125000,
				unitPriceCents: 125000,
				discounted: false,
				discountCentsPerUnit: 0,
				quantity: 2,
				stockValueCents: 250000,
				updatedAt: new Date(1).toISOString(),
			},
			cashBalance: {
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				amountCents: 0,
				updatedAt: new Date(1).toISOString(),
			},
		};
		const courierService = {
			getRecentSales: vi.fn().mockResolvedValue(recentSales),
			getSalesHistory: vi.fn().mockResolvedValue(history),
			cancelCourierSale: vi.fn().mockResolvedValue(cancelResponse),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(controller.recentSales(actor, "3")).resolves.toEqual(recentSales);
		expect(courierService.getRecentSales).toHaveBeenCalledWith(actor, 3);
		await expect(
			controller.salesHistory(actor, {
				cursor: "cursor1",
				limit: "20",
				search: "Икра",
				status: "cancelled",
			}),
		).resolves.toEqual(history);
		expect(courierService.getSalesHistory).toHaveBeenCalledWith(actor, {
			cursor: "cursor1",
			limit: 20,
			search: "Икра",
			status: "cancelled",
		});
		await expect(controller.salesHistory(actor, { status: "unknown" }))
			.rejects.toMatchObject({ code: "VALIDATION_ERROR" });
		await expect(controller.salesHistory(undefined, {}))
			.rejects.toMatchObject({ code: "UNAUTHENTICATED" });
			await expect(
				controller.cancelSale(actor, "sale1", { reason: " Ошибка клиента " }, idempotencyKey),
			).resolves.toEqual(cancelResponse);
			expect(courierService.cancelCourierSale).toHaveBeenCalledWith(actor, "sale1", {
				reason: "Ошибка клиента",
			}, idempotencyKey);
			await expect(controller.cancelSale(actor, "sale1", { reason: "  " }, idempotencyKey))
				.rejects.toMatchObject({ code: "VALIDATION_ERROR" });
			await expect(controller.cancelSale(undefined, "sale1", { reason: "Ошибка клиента" }, idempotencyKey))
				.rejects.toMatchObject({ code: "UNAUTHENTICATED" });
	});

	it("returns courier unload options through service", async () => {
		const unloadOptions = {
			distributors: [{
				distributorId: "dist1",
				distributorName: "Распределитель Центральный",
			}],
			productItems: [{
				courierProductBalanceId: "courier-balance1",
				productBatchId: "batch1",
				productName: "Икра горбуши",
				unitPriceCents: 125000,
				availableQuantity: 2,
				stockValueCents: 250000,
				updatedAt: new Date(0).toISOString(),
			}],
			cashBalance: {
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				amountCents: 100000,
				updatedAt: new Date(0).toISOString(),
			},
		};
		const courierService = {
			getUnloadOptions: vi.fn().mockResolvedValue(unloadOptions),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(controller.unloadOptions(actor)).resolves.toEqual(unloadOptions);
		expect(courierService.getUnloadOptions).toHaveBeenCalledWith(actor);
	});

	it("validates and creates courier unload through service", async () => {
		const response = {
			unload: {
				id: "unload1",
				courierUserId: "courier1",
				distributorId: "dist1",
				cashAmountCents: 100000,
				comment: null,
				operationId: "op1",
				actorUserId: "courier1",
				createdAt: new Date(0).toISOString(),
			},
			items: [{
				id: "unload-item1",
				courierUnloadId: "unload1",
				courierProductBalanceId: "courier-balance1",
				distributorProductBalanceId: "distributor-balance1",
				productBatchId: "batch1",
				quantity: 2,
				unitPriceCents: 125000,
				stockValueCents: 250000,
			}],
			courierProductBalances: [{
				id: "courier-balance1",
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				productBatchId: "batch1",
				productName: "Икра горбуши",
				unitPriceCents: 125000,
				quantity: 0,
				stockValueCents: 0,
				updatedAt: new Date(0).toISOString(),
			}],
			courierCashBalance: {
				courierUserId: "courier1",
				courierLogin: "courier",
				courierDisplayName: "Courier",
				amountCents: 0,
				updatedAt: new Date(0).toISOString(),
			},
			distributorProductBalances: [{
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
			distributorCashBalance: {
				distributorId: "dist1",
				distributorName: "Распределитель Центральный",
				amountCents: 100000,
				updatedAt: new Date(0).toISOString(),
			},
		};
		const courierService = {
			createCourierUnload: vi.fn().mockResolvedValue(response),
		} as unknown as CourierService;
		const controller = new CourierController(courierService);

		await expect(
				controller.createUnload(actor, {
					distributorId: "dist1",
					items: [{ courierProductBalanceId: "courier-balance1", quantity: 2 }],
					cashAmountCents: 100000,
				}, idempotencyKey),
			).resolves.toEqual(response);
			expect(courierService.createCourierUnload).toHaveBeenCalledWith(actor, {
				distributorId: "dist1",
				items: [{ courierProductBalanceId: "courier-balance1", quantity: 2 }],
				cashAmountCents: 100000,
			}, idempotencyKey);
			await expect(
				controller.createUnload(actor, {
					distributorId: "dist1",
					items: [],
					cashAmountCents: 0,
				}, idempotencyKey),
			).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
			await expect(
				controller.createUnload(actor, {
				distributorId: "dist1",
				items: [
					{ courierProductBalanceId: "courier-balance1", quantity: 1 },
					{ courierProductBalanceId: "courier-balance1", quantity: 1 },
					],
					cashAmountCents: 0,
				}, idempotencyKey),
			).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});
});
