import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { DirectAccountingController } from "../src/direct-accounting/direct-accounting.controller";
import type { DirectAccountingService } from "../src/direct-accounting/direct-accounting.service";
import { REQUIRED_PERMISSION_METADATA } from "../src/policy/require-permission.decorator";

const actor = {
	userId: "director1",
	login: "director",
	displayName: "Director",
	role: "director" as const,
	permissions: ["direct_accounting.manage"] as const,
};

describe("DirectAccountingController", () => {
	it("protects the whole controller with direct accounting permission", () => {
		const reflector = new Reflector();
		expect(reflector.get(REQUIRED_PERMISSION_METADATA, DirectAccountingController)).toBe(
			"direct_accounting.manage",
		);
	});

	it("validates and normalizes a sale before forwarding it", async () => {
		const sale = {
			id: "sale1",
			productName: "Икра горбуши",
			soldOn: "2026-09-08",
			quantityKg: 2.5,
			unitPriceCents: 120_000,
			totalCents: 300_000,
			createdAt: new Date(0).toISOString(),
			updatedAt: new Date(0).toISOString(),
		};
		const service = { createSale: vi.fn().mockResolvedValue(sale) } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createSale(actor, "request-1", {
			productName: " Икра горбуши ",
			soldOn: "2026-09-08",
			quantityKg: 2.5,
			unitPriceCents: 120_000,
		})).resolves.toEqual({ sale });
		expect(service.createSale).toHaveBeenCalledWith(actor, {
			productName: "Икра горбуши",
			soldOn: "2026-09-08",
			quantityKg: 2.5,
			unitPriceCents: 120_000,
		}, "request-1");
	});

	it("rejects invalid writes and missing actor", async () => {
		const service = { createSale: vi.fn() } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createSale(actor, "request-2", {
			productName: "Икра",
			soldOn: "2026-09-08",
			quantityKg: 0,
			unitPriceCents: 120_000,
		})).rejects.toThrow("Проверьте количество");
		await expect(controller.createSale(undefined, "request-3", {
			productName: "Икра",
			soldOn: "2026-09-08",
			quantityKg: 1,
			unitPriceCents: 120_000,
		})).rejects.toThrow(AppError);
		expect(service.createSale).not.toHaveBeenCalled();
	});
});
