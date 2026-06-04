import { describe, expect, it, vi } from "vitest";
import { DistributorController } from "../src/distributor/distributor.controller";
import type { DistributorService } from "../src/distributor/distributor.service";
import type { Actor } from "../src/policy/actor";

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

	it("returns sale options from service", async () => {
		const saleOptions = {
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
		const distributorService = {
			getSaleOptions: vi.fn().mockResolvedValue(saleOptions),
		} as unknown as DistributorService;
		const controller = new DistributorController(distributorService);

		await expect(controller.saleOptions()).resolves.toEqual(saleOptions);
		expect(distributorService.getSaleOptions).toHaveBeenCalledWith();
	});

	it("returns cash balances from service", async () => {
		const cashBalances = {
			totalAmountCents: 0,
			items: [{
				distributorId: "dist1",
				distributorName: "Распределитель Центральный",
				active: true,
				amountCents: 0,
				updatedAt: null,
			}],
		};
		const distributorService = {
			getCashBalances: vi.fn().mockResolvedValue(cashBalances),
		} as unknown as DistributorService;
		const controller = new DistributorController(distributorService);

		await expect(controller.cashBalances()).resolves.toEqual(cashBalances);
		expect(distributorService.getCashBalances).toHaveBeenCalledWith();
	});

	it("validates and creates distributor sale through service", async () => {
		const response = {
			sale: {
				id: "sale1",
				distributorProductBalanceId: "balance1",
				distributorId: "dist1",
				productBatchId: "batch1",
				clientId: "client1",
				quantity: 2,
				unitPriceCents: 125000,
				totalCents: 250000,
				paymentMethod: "cash" as const,
				comment: null,
				operationId: "op1",
				actorUserId: "actor1",
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
			cashBalance: {
				distributorId: "dist1",
				distributorName: "Распределитель Центральный",
				active: true,
				amountCents: 250000,
				updatedAt: new Date(0).toISOString(),
			},
		};
		const actor: Actor = {
			userId: "actor1",
			login: "actor",
			displayName: "Actor",
			role: "distributor_worker" as const,
			permissions: ["distributor.sale.create"],
		};
		const distributorService = {
			createDistributorSale: vi.fn().mockResolvedValue(response),
		} as unknown as DistributorService;
		const controller = new DistributorController(distributorService);

		await expect(
			controller.createSale(actor, {
				distributorProductBalanceId: "balance1",
				clientId: "client1",
				quantity: 2,
				paymentMethod: "cash",
			}),
		).resolves.toEqual(response);
		expect(distributorService.createDistributorSale).toHaveBeenCalledWith(actor, {
			distributorProductBalanceId: "balance1",
			clientId: "client1",
			quantity: 2,
			paymentMethod: "cash",
		});
		await expect(
			controller.createSale(actor, {
				distributorProductBalanceId: "balance1",
				clientId: "client1",
				quantity: 0,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("validates and creates distributor cash withdrawal through service", async () => {
		const response = {
			withdrawal: {
				id: "withdrawal1",
				distributorId: "dist1",
				amountCents: 50000,
				comment: "Забрал наличные",
				operationId: "op1",
				actorUserId: "director1",
				createdAt: new Date(0).toISOString(),
			},
			cashBalance: {
				distributorId: "dist1",
				distributorName: "Распределитель Центральный",
				active: true,
				amountCents: 150000,
				updatedAt: new Date(1).toISOString(),
			},
		};
		const actor: Actor = {
			userId: "director1",
			login: "director",
			displayName: "Director",
			role: "director" as const,
			permissions: ["cash.withdraw"],
		};
		const distributorService = {
			createCashWithdrawal: vi.fn().mockResolvedValue(response),
		} as unknown as DistributorService;
		const controller = new DistributorController(distributorService);

		await expect(
			controller.createCashWithdrawal(actor, {
				distributorId: "dist1",
				amountCents: 50000,
				comment: " Забрал наличные ",
			}),
		).resolves.toEqual(response);
		expect(distributorService.createCashWithdrawal).toHaveBeenCalledWith(actor, {
			distributorId: "dist1",
			amountCents: 50000,
			comment: "Забрал наличные",
		});
		await expect(
			controller.createCashWithdrawal(actor, {
				distributorId: "dist1",
				amountCents: 0,
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
		await expect(
			controller.createCashWithdrawal(undefined, {
				distributorId: "dist1",
				amountCents: 50000,
			}),
		).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
	});
});
