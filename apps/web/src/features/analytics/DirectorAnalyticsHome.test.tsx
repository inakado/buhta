import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectorAnalyticsHome } from "./DirectorAnalyticsHome";

const analyticsResponse = {
	filters: {
		dateFrom: "2026-05-06T14:00:00.000Z",
		dateTo: "2026-06-05T14:00:00.000Z",
		periodPreset: "30d",
		timezone: "Asia/Vladivostok",
	},
	money: {
		grossRevenueCents: 320000,
		cancelledRevenueCents: 70000,
		netRevenueCents: 250000,
		cashRevenueCents: 125000,
		cashlessRevenueCents: 125000,
		saleCount: 3,
		cancellationCount: 1,
		currentCash: {
			distributorCashCents: 125000,
			courierCashCents: 70000,
			totalCashCents: 195000,
		},
		cashMovement: {
			cashSalesCents: 150000,
			courierCashReturnedCents: 40000,
			directorWithdrawalsCents: 50000,
			cashSaleCancellationsCents: 25000,
		},
	},
	production: {
		rawMaterialIntakes: [{
			rawMaterialTypeId: "raw1",
			rawMaterialName: "Икра горбуши сырец",
			unit: "кг",
			quantity: 12,
		}],
		rawMaterialConsumed: [{
			rawMaterialTypeId: "raw1",
			rawMaterialName: "Икра горбуши сырец",
			unit: "кг",
			quantity: 8,
		}],
		currentRawMaterialBalances: [{
			rawMaterialTypeId: "raw1",
			rawMaterialName: "Икра горбуши сырец",
			unit: "кг",
			quantity: 4,
		}],
			productReleased: [{
				productName: "Икра горбуши",
				quantity: 12,
				rawMaterialConsumedQuantity: 8,
				rawMaterialUnit: "кг",
			}],
		productTransferredToDistributorUnits: 8,
		currentWorkshopProductUnits: 4,
		summary: {
			rawMaterialConsumedQuantity: 8,
			rawMaterialConsumedUnit: "кг",
			productReleasedUnits: 12,
		},
	},
	charts: {
		revenueByDay: [{
			date: "2026-06-05",
			grossRevenueCents: 320000,
			cancelledRevenueCents: 70000,
			netRevenueCents: 250000,
		}],
		paymentSplit: {
			cashRevenueCents: 125000,
			cashlessRevenueCents: 125000,
		},
		rawMaterialAndProductOutput: {
			rawMaterialConsumedQuantity: 8,
			rawMaterialConsumedUnit: "кг",
			productReleasedUnits: 12,
		},
	},
	warnings: [],
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

function renderAnalytics() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<DirectorAnalyticsHome />
		</QueryClientProvider>,
	);
}

describe("DirectorAnalyticsHome", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders director money and production analytics", async () => {
		const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(analyticsResponse));
		vi.stubGlobal("fetch", fetchMock);

		renderAnalytics();

		expect(await screen.findByRole("heading", { name: "Аналитика" })).toBeTruthy();
		expect(screen.queryByText("Директор")).toBeNull();
		expect(await screen.findByText("Деньги")).toBeTruthy();
		expect(screen.getByText("Текущие наличные")).toBeTruthy();
		expect(screen.getByText("Деньги за период")).toBeTruthy();
		expect(screen.getByText("Сырье в продукт: 8 кг")).toBeTruthy();
		expect(screen.getByText("Сырье")).toBeTruthy();
		expect(screen.getByText("Продукция")).toBeTruthy();
		expect(screen.getByText("12 шт · сырье 8 кг")).toBeTruthy();
		expect(screen.getAllByText("Икра горбуши сырец")).toHaveLength(1);
		expect(screen.queryByText("Движение наличных")).toBeNull();
		expect(screen.queryByText("Выручка по дням")).toBeNull();
		expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/analytics/director?periodPreset=30d"))).toBe(true);

		fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
		await waitFor(() => {
			expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/analytics/director?periodPreset=7d"))).toBe(true);
		});
	});

	it("shows a readable error state", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { message: "Forbidden" } }, 403)));

		renderAnalytics();

		expect(await screen.findByText("Не удалось загрузить аналитику")).toBeTruthy();
		expect(screen.queryByText("Деньги за период")).toBeNull();
	});
});
