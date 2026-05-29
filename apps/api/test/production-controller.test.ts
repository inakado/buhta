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
			}),
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
			}),
		).resolves.toEqual({
			rawMaterialBalance,
		});
		expect(productionService.createRawMaterialIntake).toHaveBeenCalledWith(actor, {
			rawMaterialTypeId: "raw1",
			quantity: 12.5,
			comment: "Утренний приход",
		});
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
			}),
		).rejects.toThrow(AppError);
		expect(productionService.createProductBatch).not.toHaveBeenCalled();
	});
});
