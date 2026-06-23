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
			totalNetWeightGrams: 2400,
			rawMaterialConsumedQuantity: 8,
			rawMaterialUnit: "кг",
		}],
		productTransferredToDistributorUnits: 8,
		productTransferredToDistributorTotalNetWeightGrams: 1600,
		currentWorkshopProductUnits: 4,
		currentWorkshopProductTotalNetWeightGrams: 800,
		summary: {
			rawMaterialConsumedQuantity: 8,
			rawMaterialConsumedUnit: "кг",
			productReleasedUnits: 12,
			productReleasedTotalNetWeightGrams: 2400,
		},
	},
	charts: {
		revenueByDay: [
			{
				date: "2026-06-03",
				grossRevenueCents: 100000,
				cancelledRevenueCents: 0,
				netRevenueCents: 100000,
			},
			{
				date: "2026-06-04",
				grossRevenueCents: 90000,
				cancelledRevenueCents: 20000,
				netRevenueCents: 70000,
			},
			{
				date: "2026-06-05",
				grossRevenueCents: 320000,
				cancelledRevenueCents: 70000,
				netRevenueCents: 250000,
			},
		],
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
		expect(await screen.findByText("Выручка")).toBeTruthy();
		expect(screen.getByText("2500")).toBeTruthy();
		expect(screen.getByText("Касса")).toBeTruthy();
		expect(screen.getByText("1950")).toBeTruthy();
		expect(screen.getByText("Выпуск")).toBeTruthy();
		expect(screen.getAllByText("2,4 кг • 12 шт").length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("Наличными")).toBeTruthy();
		expect(screen.getAllByText("Распределитель").length).toBeGreaterThan(0);
		expect(screen.getByText("Курьеры")).toBeTruthy();
		expect(screen.queryByText("Отмены")).toBeNull();
		expect(screen.queryByText("1 отмена")).toBeNull();
		expect(screen.queryByText("Движение наличных")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "Обзор" }));
		expect(screen.getByText("Средний чек")).toBeTruthy();
		expect(screen.getByText("Продаж")).toBeTruthy();
		expect(screen.getByText("Отменено")).toBeTruthy();
		expect(screen.getByText("Приход")).toBeTruthy();
		expect(screen.getByText("Расход")).toBeTruthy();
		expect(screen.getByText("Остаток")).toBeTruthy();
		expect(screen.getByText("12 кг")).toBeTruthy();
		expect(screen.getByText("8 кг")).toBeTruthy();
		expect(screen.getByText("4 кг")).toBeTruthy();
		expect(screen.queryByText("На распределитель")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "Деньги" }));
		expect(screen.getByText("Выручка по дням")).toBeTruthy();
		expect(screen.getByText("3 дн.")).toBeTruthy();
		expect(screen.queryByText("Безнал")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "Производство" }));
		expect(await screen.findByText("Сырье")).toBeTruthy();
		expect(screen.getByText("Продукция")).toBeTruthy();
		expect(screen.getByText("Количество")).toBeTruthy();
		expect(screen.getByText("Сырье на 1 шт")).toBeTruthy();
		expect(screen.getAllByText("2,4 кг • 12 шт").length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("0,667 кг/шт")).toBeTruthy();
		expect(screen.getAllByText("Икра горбуши сырец")).toHaveLength(1);
		expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/analytics/director?periodPreset=30d"))).toBe(true);

		fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
		await waitFor(() => {
			expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/analytics/director?periodPreset=7d"))).toBe(true);
		});
	});

	it("applies a custom director analytics period", async () => {
		const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(analyticsResponse));
		vi.stubGlobal("fetch", fetchMock);

		renderAnalytics();

		const periodButton = await screen.findByRole("button", { name: /мая.*июн/i });
		fireEvent.click(periodButton);

		fireEvent.change(screen.getByLabelText("С"), { target: { value: "2026-01-01" } });
		fireEvent.change(screen.getByLabelText("По"), { target: { value: "2026-12-31" } });
		fireEvent.click(screen.getByRole("button", { name: "Применить" }));

		await waitFor(() => {
			expect(fetchMock.mock.calls.some(([input]) => {
				const url = String(input);
				return url.includes("/analytics/director?dateFrom=2026-01-01&dateTo=2026-12-31");
			})).toBe(true);
		});
	});

	it("shows a readable error state", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { message: "Forbidden" } }, 403)));

		renderAnalytics();

		expect(await screen.findByText("Не удалось загрузить аналитику.")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Повторить" })).toBeTruthy();
		expect(screen.queryByText("За период")).toBeNull();
	});
});
