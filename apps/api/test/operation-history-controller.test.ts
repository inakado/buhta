import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { OperationsController } from "../src/operations/operations.controller";
import type { OperationsService } from "../src/operations/operations.service";

describe("OperationsController", () => {
	it("lists operation history and parses query", async () => {
		const response = {
			items: [],
			filters: {
				dateFrom: new Date(0).toISOString(),
				dateTo: new Date(1).toISOString(),
				limit: 30,
			},
			nextCursor: null,
		};
		const operationsService = {
			getHistory: vi.fn().mockResolvedValue(response),
		} as unknown as OperationsService;
		const controller = new OperationsController(operationsService);

		await expect(controller.history({
			limit: "30",
			operationType: "distributor.sale.create",
		})).resolves.toEqual(response);
		expect(operationsService.getHistory).toHaveBeenCalledWith({
			limit: 30,
			operationType: "distributor.sale.create",
		});
	});

	it("rejects ambiguous type query and invalid limit", async () => {
		const operationsService = {
			getHistory: vi.fn(),
		} as unknown as OperationsService;
		const controller = new OperationsController(operationsService);

		await expect(controller.history({ type: "distributor.sale.create" })).rejects.toThrow(AppError);
		await expect(controller.history({ limit: "101" })).rejects.toThrow(AppError);
		expect(operationsService.getHistory).not.toHaveBeenCalled();
	});

	it("returns operation history filter options", async () => {
		const response = {
			operationTypes: ["distributor.sale.create"],
			roles: ["admin", "director"],
			actorUsers: [],
			entityTypes: ["distributor_sale"],
		};
		const operationsService = {
			getHistoryOptions: vi.fn().mockResolvedValue(response),
		} as unknown as OperationsService;
		const controller = new OperationsController(operationsService);

		await expect(controller.historyOptions()).resolves.toEqual(response);
		expect(operationsService.getHistoryOptions).toHaveBeenCalledOnce();
	});
});
