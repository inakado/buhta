import { describe, expect, it, vi } from "vitest";
import { CourierController } from "../src/courier/courier.controller";
import type { CourierService } from "../src/courier/courier.service";
import type { Actor } from "../src/policy/actor";

const actor: Actor = {
	userId: "courier1",
	login: "courier",
	displayName: "Courier",
	role: "courier",
	permissions: ["courier.stock.read", "courier.stock.load"],
};

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
			}),
		).resolves.toEqual(response);
		expect(courierService.createCourierLoad).toHaveBeenCalledWith(actor, {
			distributorProductBalanceId: "balance1",
			quantity: 2,
		});
		await expect(
			controller.createLoad(actor, {
				distributorProductBalanceId: "balance1",
				quantity: 0,
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});
});
