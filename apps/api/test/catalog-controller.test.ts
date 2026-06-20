import { describe, expect, it, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { CatalogController } from "../src/catalog/catalog.controller";
import type { CatalogService } from "../src/catalog/catalog.service";
import { AppError } from "../src/common/errors/app-error";
import { REQUIRED_PERMISSION_METADATA } from "../src/policy/require-permission.decorator";

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
	it("uses granular permissions for raw material and packaging handlers only", () => {
		const reflector = new Reflector();
		const permissionFor = (handlerName: keyof CatalogController) =>
			reflector.getAllAndOverride(REQUIRED_PERMISSION_METADATA, [
				CatalogController.prototype[handlerName],
				CatalogController,
			]);

		expect(permissionFor("listRawMaterialTypes")).toBe("catalog.raw_material.manage");
		expect(permissionFor("createRawMaterialType")).toBe("catalog.raw_material.manage");
		expect(permissionFor("updateRawMaterialType")).toBe("catalog.raw_material.manage");
		expect(permissionFor("archiveRawMaterialType")).toBe("catalog.raw_material.manage");
		expect(permissionFor("listPackagingTypes")).toBe("catalog.packaging.manage");
		expect(permissionFor("createPackagingType")).toBe("catalog.packaging.manage");
		expect(permissionFor("updatePackagingType")).toBe("catalog.packaging.manage");
		expect(permissionFor("archivePackagingType")).toBe("catalog.packaging.manage");
		expect(permissionFor("listDistributors")).toBe("catalog.manage");
		expect(permissionFor("createDistributor")).toBe("catalog.manage");
		expect(permissionFor("updateDistributor")).toBe("catalog.manage");
		expect(permissionFor("archiveDistributor")).toBe("catalog.manage");
		expect(permissionFor("listProductTemplates")).toBe("catalog.manage");
		expect(permissionFor("createProductTemplate")).toBe("catalog.manage");
		expect(permissionFor("updateProductTemplate")).toBe("catalog.manage");
		expect(permissionFor("archiveProductTemplate")).toBe("catalog.manage");
	});

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
				priceCents: 125000,
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
