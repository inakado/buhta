import { describe, expect, it, vi } from "vitest";
import { CatalogController } from "../src/catalog/catalog.controller";
import type { CatalogService } from "../src/catalog/catalog.service";
import { AppError } from "../src/common/errors/app-error";

const actor = {
	userId: "director1",
	login: "director",
	displayName: "Director",
	role: "director" as const,
	permissions: ["catalog.manage"] as const,
};

const rawMaterialType = {
	id: "raw1",
	name: "Горбуша",
	unit: "кг",
	active: true,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

describe("CatalogController", () => {
	it("validates raw material create payload before calling service", async () => {
		const catalogService = {
			createRawMaterialType: vi.fn(),
		} as unknown as CatalogService;
		const controller = new CatalogController(catalogService);

		await expect(controller.createRawMaterialType(actor, { name: "", unit: "кг" })).rejects.toThrow(AppError);
		expect(catalogService.createRawMaterialType).not.toHaveBeenCalled();
	});

	it("returns raw material type after creation", async () => {
		const catalogService = {
			createRawMaterialType: vi.fn().mockResolvedValue(rawMaterialType),
		} as unknown as CatalogService;
		const controller = new CatalogController(catalogService);

		await expect(controller.createRawMaterialType(actor, { name: "Горбуша", unit: "кг" })).resolves.toEqual({
			rawMaterialType,
		});
		expect(catalogService.createRawMaterialType).toHaveBeenCalledWith(actor, {
			name: "Горбуша",
			unit: "кг",
		});
	});

	it("validates product template links before calling service", async () => {
		const catalogService = {
			createProductTemplate: vi.fn(),
		} as unknown as CatalogService;
		const controller = new CatalogController(catalogService);

		await expect(
			controller.createProductTemplate(actor, {
				name: "Икра горбуши",
				rawMaterialTypeId: "",
				packagingTypeId: "pack1",
			}),
		).rejects.toThrow(AppError);
		expect(catalogService.createProductTemplate).not.toHaveBeenCalled();
	});

	it("requires actor for writes", async () => {
		const catalogService = {
			createDistributor: vi.fn(),
		} as unknown as CatalogService;
		const controller = new CatalogController(catalogService);

		await expect(controller.createDistributor(undefined, { name: "Основной распределитель" })).rejects.toThrow(
			AppError,
		);
		expect(catalogService.createDistributor).not.toHaveBeenCalled();
	});
});
