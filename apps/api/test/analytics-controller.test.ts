import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { AnalyticsController } from "../src/analytics/analytics.controller";
import type { AnalyticsService } from "../src/analytics/analytics.service";

describe("AnalyticsController", () => {
	it("returns director analytics and parses query", async () => {
		const response = {
			filters: {
				dateFrom: "2036-06-04T14:00:00.000Z",
				dateTo: "2036-06-05T14:00:00.000Z",
				periodPreset: "today",
				timezone: "Asia/Vladivostok",
			},
			money: {
				grossRevenueCents: 0,
				cancelledRevenueCents: 0,
				netRevenueCents: 0,
				cashRevenueCents: 0,
				cashlessRevenueCents: 0,
				saleCount: 0,
				cancellationCount: 0,
				currentCash: {
					distributorCashCents: 0,
					courierCashCents: 0,
					totalCashCents: 0,
				},
				cashMovement: {
					cashSalesCents: 0,
					courierCashReturnedCents: 0,
					directorWithdrawalsCents: 0,
					cashSaleCancellationsCents: 0,
				},
			},
			production: {
				rawMaterialIntakes: [],
				rawMaterialConsumed: [],
				currentRawMaterialBalances: [],
				productReleased: [],
				productTransferredToDistributorUnits: 0,
				currentWorkshopProductUnits: 0,
				summary: {
					rawMaterialConsumedQuantity: 0,
					rawMaterialConsumedUnit: "кг",
					productReleasedUnits: 0,
				},
			},
			charts: {
				revenueByDay: [],
				paymentSplit: {
					cashRevenueCents: 0,
					cashlessRevenueCents: 0,
				},
				rawMaterialAndProductOutput: {
					rawMaterialConsumedQuantity: 0,
					rawMaterialConsumedUnit: "кг",
					productReleasedUnits: 0,
				},
			},
			warnings: [],
		};
		const analyticsService = {
			getDirectorAnalytics: vi.fn().mockResolvedValue(response),
		} as unknown as AnalyticsService;
		const controller = new AnalyticsController(analyticsService);

		await expect(controller.director({
			dateFrom: "2036-06-05",
			dateTo: "2036-06-05",
			periodPreset: "today",
		})).resolves.toEqual(response);
		expect(analyticsService.getDirectorAnalytics).toHaveBeenCalledWith({
			dateFrom: "2036-06-05",
			dateTo: "2036-06-05",
			periodPreset: "today",
		});
	});

	it("rejects unknown query fields and invalid presets", async () => {
		const analyticsService = {
			getDirectorAnalytics: vi.fn(),
		} as unknown as AnalyticsService;
		const controller = new AnalyticsController(analyticsService);

		await expect(controller.director({ type: "money" })).rejects.toThrow(AppError);
		await expect(controller.director({ periodPreset: "365d" })).rejects.toThrow(AppError);
		expect(analyticsService.getDirectorAnalytics).not.toHaveBeenCalled();
	});
});
