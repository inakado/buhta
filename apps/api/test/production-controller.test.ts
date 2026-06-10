import { describe, expect, it, vi } from "vitest";
import { ProductionController } from "../src/production/production.controller";
import type { ProductionService } from "../src/production/production.service";
import { AppError } from "../src/common/errors/app-error";

const actor = {
	userId: "production-manager1",
	login: "production-manager",
	displayName: "Production Manager",
	role: "production_manager" as const,
	permissions: ["production.manage"] as const,
};

const rawMaterialBalance = {
	id: "balance1",
	typeId: "raw1",
	name: "Горбуша",
	unit: "кг",
	quantity: 12.5,
	updatedAt: new Date(0).toISOString(),
};
const idempotencyKey = "controller-test-key";

describe("ProductionController", () => {
	it("validates raw material intake payload before calling service", async () => {
		const productionService = {
			createRawMaterialIntake: vi.fn(),
		} as unknown as ProductionService;
		const controller = new ProductionController(productionService);

		await expect(
				controller.createRawMaterialIntake(actor, {
					rawMaterialTypeId: "raw1",
					quantity: 0,
				}, idempotencyKey),
		).rejects.toThrow(AppError);
		expect(productionService.createRawMaterialIntake).not.toHaveBeenCalled();
	});

	it("returns updated raw material balance after intake", async () => {
		const productionService = {
			createRawMaterialIntake: vi.fn().mockResolvedValue(rawMaterialBalance),
		} as unknown as ProductionService;
		const controller = new ProductionController(productionService);

		await expect(
				controller.createRawMaterialIntake(actor, {
					rawMaterialTypeId: "raw1",
					quantity: 12.5,
					comment: "Утренний приход",
				}, idempotencyKey),
		).resolves.toEqual({
			rawMaterialBalance,
		});
		expect(productionService.createRawMaterialIntake).toHaveBeenCalledWith(actor, {
				rawMaterialTypeId: "raw1",
				quantity: 12.5,
				comment: "Утренний приход",
			}, idempotencyKey);
	});

	it("requires actor for writes", async () => {
		const productionService = {
			createProductBatch: vi.fn(),
		} as unknown as ProductionService;
		const controller = new ProductionController(productionService);

		await expect(
				controller.createProductBatch(undefined, {
					productTemplateId: "template1",
					quantity: 4,
					consumedRawMaterialQuantity: 2.5,
				}, idempotencyKey),
		).rejects.toThrow(AppError);
		expect(productionService.createProductBatch).not.toHaveBeenCalled();
	});

	it("validates product transfer payload before calling service", async () => {
		const productionService = {
			createProductTransfer: vi.fn(),
		} as unknown as ProductionService;
		const controller = new ProductionController(productionService);

		await expect(
				controller.createProductTransfer(actor, {
					productBatchId: "batch1",
					distributorId: "dist1",
					quantity: 0,
				}, idempotencyKey),
		).rejects.toThrow(AppError);
		expect(productionService.createProductTransfer).not.toHaveBeenCalled();
	});

	it("returns transfer response after product transfer", async () => {
		const transferResponse = {
			transfer: {
				id: "transfer1",
				productBatchId: "batch1",
				distributorId: "dist1",
				quantity: 2,
				comment: "На Центральный",
				operationId: "op1",
				actorUserId: actor.userId,
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
		};
		const productionService = {
			createProductTransfer: vi.fn().mockResolvedValue(transferResponse),
		} as unknown as ProductionService;
		const controller = new ProductionController(productionService);

		await expect(
				controller.createProductTransfer(actor, {
					productBatchId: "batch1",
					distributorId: "dist1",
					quantity: 2,
					comment: " На Центральный ",
				}, idempotencyKey),
		).resolves.toEqual(transferResponse);
		expect(productionService.createProductTransfer).toHaveBeenCalledWith(actor, {
			productBatchId: "batch1",
				distributorId: "dist1",
				quantity: 2,
				comment: "На Центральный",
			}, idempotencyKey);
	});
});
