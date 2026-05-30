import { describe, expect, it, vi } from "vitest";
import { DistributorController } from "../src/distributor/distributor.controller";
import type { DistributorService } from "../src/distributor/distributor.service";

describe("DistributorController", () => {
	it("returns distributor inventory from service", async () => {
		const inventory = {
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
				id: "balance1",
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
		const distributorService = {
			getInventory: vi.fn().mockResolvedValue(inventory),
		} as unknown as DistributorService;
		const controller = new DistributorController(distributorService);

		await expect(controller.inventory()).resolves.toEqual(inventory);
		expect(distributorService.getInventory).toHaveBeenCalledWith();
	});
});
