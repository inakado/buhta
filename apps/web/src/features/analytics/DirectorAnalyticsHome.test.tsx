import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
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

const directAccountingResponse = {
	filters: {
		anchorDate: "2026-09-08",
		detailPeriod: "day",
		dateFrom: "2026-09-08",
		dateTo: "2026-09-08",
		timezone: "Asia/Vladivostok",
	},
	selection: {
		dateFrom: "2026-09-08",
		dateTo: "2026-09-08",
		quantityKg: 0.8,
		receivedQuantityKg: 2,
		balanceQuantityKg: 1.2,
		revenueCents: 120_000,
		expensesCents: 25_000,
		transfersCents: 50_000,
	},
	totals: {
		day: { dateFrom: "2026-09-08", dateTo: "2026-09-08", quantityKg: 0.8, receivedQuantityKg: 2, balanceQuantityKg: 1.2, revenueCents: 120_000, expensesCents: 25_000, transfersCents: 50_000 },
		week: { dateFrom: "2026-09-02", dateTo: "2026-09-08", quantityKg: 2, receivedQuantityKg: 3, balanceQuantityKg: 1.2, revenueCents: 240_000, expensesCents: 25_000, transfersCents: 50_000 },
		month: { dateFrom: "2026-08-10", dateTo: "2026-09-08", quantityKg: 4, receivedQuantityKg: 5.2, balanceQuantityKg: 1.2, revenueCents: 480_000, expensesCents: 25_000, transfersCents: 50_000 },
	},
	byProduct: [{ productName: "Икра кеты", quantityKg: 0.8, receivedQuantityKg: 2, balanceQuantityKg: 1.2, revenueCents: 120_000 }],
};

const directAccountingEntriesResponse = {
	entries: [
		{
			kind: "sale",
			id: "sale-1",
			productName: "Икра кеты",
			occurredOn: "2026-09-08",
			quantityKg: 0.8,
			unitPriceCents: 150_000,
			totalCents: 120_000,
			createdAt: "2026-09-08T04:30:00.000Z",
			updatedAt: "2026-09-08T04:30:00.000Z",
		},
		{
			kind: "expense",
			id: "expense-1",
			name: "Доставка",
			occurredOn: "2026-09-08",
			amountCents: 25_000,
			createdAt: "2026-09-08T05:00:00.000Z",
			updatedAt: "2026-09-08T05:00:00.000Z",
		},
		{
			kind: "transfer",
			id: "transfer-1",
			comment: "На закупку",
			occurredOn: "2026-09-08",
			amountCents: 50_000,
			createdAt: "2026-09-08T05:30:00.000Z",
			updatedAt: "2026-09-08T05:30:00.000Z",
		},
	],
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

function renderAnalytics(props: ComponentProps<typeof DirectorAnalyticsHome> = {}) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<DirectorAnalyticsHome {...props} />
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

	it("uses clear presets and a custom range for direct accounting", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes("/direct-accounting/statistics")) return jsonResponse(directAccountingResponse);
			if (url.includes("/direct-accounting/entries")) return jsonResponse(directAccountingEntriesResponse);
			return jsonResponse(analyticsResponse);
		});
		vi.stubGlobal("fetch", fetchMock);

		renderAnalytics();
		fireEvent.click(await screen.findByRole("button", { name: "Открыть статистику прямого учета" }));

		expect(await screen.findByText("Икра кеты")).toBeTruthy();
		expect(screen.getByRole("button", { name: "30 дней" }).getAttribute("aria-pressed")).toBe("true");
		expect(fetchMock.mock.calls.some(([input]) => String(input).includes("detailPeriod=month"))).toBe(true);
		expect(screen.getByText("Затраты")).toBeTruthy();
		expect(screen.getByText("250 ₽")).toBeTruthy();
		expect(screen.getByText("Передано")).toBeTruthy();
		expect(screen.getByText("500 ₽")).toBeTruthy();
		expect(screen.getByText("Остаток товара")).toBeTruthy();
		expect(screen.getAllByText("1,2 кг").length).toBeGreaterThanOrEqual(2);
		expect(await screen.findByText("Денежные операции")).toBeTruthy();
		const revenueToggle = screen.getByRole("checkbox", { name: "Выручка" }) as HTMLInputElement;
		const expensesToggle = screen.getByRole("checkbox", { name: "Затраты" }) as HTMLInputElement;
		const transfersToggle = screen.getByRole("checkbox", { name: "Передача" }) as HTMLInputElement;
		expect(revenueToggle.checked).toBe(true);
		expect(expensesToggle.checked).toBe(false);
		expect(transfersToggle.checked).toBe(false);
		fireEvent.click(expensesToggle);
		fireEvent.click(transfersToggle);
		expect(expensesToggle.checked).toBe(true);
		expect(transfersToggle.checked).toBe(true);
		expect(screen.getAllByText("08.09.2026").length).toBe(3);
		expect(screen.getByText("Икра кеты, 0,8 кг")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Сегодня" })).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
		await waitFor(() => {
			expect(fetchMock.mock.calls.some(([input]) => String(input).includes("detailPeriod=week"))).toBe(true);
		});

		fireEvent.click(screen.getByRole("button", { name: /8 сент/i }));
		fireEvent.change(screen.getByLabelText("С"), { target: { value: "2026-09-01" } });
		fireEvent.change(screen.getByLabelText("По"), { target: { value: "2026-09-08" } });
		fireEvent.click(screen.getByRole("button", { name: "Показать" }));
		await waitFor(() => {
			expect(fetchMock.mock.calls.some(([input]) => {
				const url = String(input);
				return url.includes("dateFrom=2026-09-01") && url.includes("dateTo=2026-09-08");
			})).toBe(true);
		});
	});

	it("opens the director home in direct accounting mode", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes("/direct-accounting/statistics")) return jsonResponse(directAccountingResponse);
			if (url.includes("/direct-accounting/entries")) return jsonResponse(directAccountingEntriesResponse);
			return jsonResponse(analyticsResponse);
		});
		vi.stubGlobal("fetch", fetchMock);

		renderAnalytics({ initialViewMode: "directAccounting", title: "Главная" });

		expect(await screen.findByRole("heading", { name: "Главная" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Вернуться к основной аналитике" }).getAttribute("aria-pressed")).toBe("true");
		expect(await screen.findByText("Икра кеты")).toBeTruthy();
		expect(fetchMock.mock.calls.some(([input]) => String(input).includes("detailPeriod=month"))).toBe(true);
	});
});
