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

	it("validates and creates a backdated receipt", async () => {
		const receipt = {
			id: "receipt1",
			productName: "Кета расчетный счет",
			receivedOn: "2026-08-15",
			quantityKg: 300,
			createdAt: new Date(0).toISOString(),
			updatedAt: new Date(0).toISOString(),
		};
		const service = { createReceipt: vi.fn().mockResolvedValue(receipt) } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createReceipt(actor, "receipt-request-1", {
			productName: " Кета расчетный счет ",
			receivedOn: "2026-08-15",
			quantityKg: 300,
		})).resolves.toEqual({ receipt });
		expect(service.createReceipt).toHaveBeenCalledWith(actor, {
			productName: "Кета расчетный счет",
			receivedOn: "2026-08-15",
			quantityKg: 300,
		}, "receipt-request-1");
	});

	it("returns a Russian field error for an invalid receipt", async () => {
		const service = { createReceipt: vi.fn() } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createReceipt(actor, "receipt-request-2", {
			productName: "Кета",
			receivedOn: "2026-08-15",
			quantityKg: 0,
		})).rejects.toThrow("Проверьте количество");
		expect(service.createReceipt).not.toHaveBeenCalled();
	});

	it("validates and creates a backdated expense", async () => {
		const expense = {
			id: "expense1",
			name: "Доставка",
			spentOn: "2026-08-15",
			amountCents: 25_050,
			createdAt: new Date(0).toISOString(),
			updatedAt: new Date(0).toISOString(),
		};
		const service = { createExpense: vi.fn().mockResolvedValue(expense) } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createExpense(actor, "expense-request-1", {
			name: " Доставка ",
			spentOn: "2026-08-15",
			amountCents: 25_050,
		})).resolves.toEqual({ expense });
		expect(service.createExpense).toHaveBeenCalledWith(actor, {
			name: "Доставка",
			spentOn: "2026-08-15",
			amountCents: 25_050,
		}, "expense-request-1");
	});

	it("returns a Russian field error for an invalid expense", async () => {
		const service = { createExpense: vi.fn() } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createExpense(actor, "expense-request-2", {
			name: "Доставка",
			spentOn: "2026-08-15",
			amountCents: 0,
		})).rejects.toThrow("Проверьте сумму");
		expect(service.createExpense).not.toHaveBeenCalled();
	});

	it("validates and creates a backdated transfer", async () => {
		const transfer = {
			id: "transfer1",
			comment: "Ивану на закупку",
			transferredOn: "2026-08-15",
			amountCents: 50_000,
			createdAt: new Date(0).toISOString(),
			updatedAt: new Date(0).toISOString(),
		};
		const service = { createTransfer: vi.fn().mockResolvedValue(transfer) } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createTransfer(actor, "transfer-request-1", {
			comment: " Ивану на закупку ",
			transferredOn: "2026-08-15",
			amountCents: 50_000,
		})).resolves.toEqual({ transfer });
		expect(service.createTransfer).toHaveBeenCalledWith(actor, {
			comment: "Ивану на закупку",
			transferredOn: "2026-08-15",
			amountCents: 50_000,
		}, "transfer-request-1");
	});

	it("returns a Russian field error for an invalid transfer", async () => {
		const service = { createTransfer: vi.fn() } as unknown as DirectAccountingService;
		const controller = new DirectAccountingController(service);

		await expect(controller.createTransfer(actor, "transfer-request-2", {
			comment: "Ивану",
			transferredOn: "2026-08-15",
			amountCents: 0,
		})).rejects.toThrow("Проверьте сумму");
		expect(service.createTransfer).not.toHaveBeenCalled();
	});
});
