import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectAccountingHome } from "./DirectAccountingHome";
import {
	createDirectAccountingReceipt,
	createDirectAccountingSale,
	deleteDirectAccountingSale,
	listDirectAccountingEntries,
	listDirectAccountingSuggestions,
	updateDirectAccountingSale,
} from "../../lib/api-client";

vi.mock("../../lib/api-client", () => ({
	createDirectAccountingReceipt: vi.fn(),
	createDirectAccountingSale: vi.fn(),
	deleteDirectAccountingReceipt: vi.fn(),
	deleteDirectAccountingSale: vi.fn(),
	listDirectAccountingEntries: vi.fn(),
	listDirectAccountingSuggestions: vi.fn(),
	updateDirectAccountingReceipt: vi.fn(),
	updateDirectAccountingSale: vi.fn(),
}));

const sale = {
	kind: "sale" as const,
	id: "sale1",
	productName: "Икра кеты",
	occurredOn: "2026-09-08",
	quantityKg: 2.5,
	unitPriceCents: 120_000,
	totalCents: 300_000,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

const saleResponse = {
	id: sale.id,
	productName: sale.productName,
	soldOn: sale.occurredOn,
	quantityKg: sale.quantityKg,
	unitPriceCents: sale.unitPriceCents,
	totalCents: sale.totalCents,
	createdAt: sale.createdAt,
	updatedAt: sale.updatedAt,
};

const receipt = {
	kind: "receipt" as const,
	id: "receipt1",
	productName: "Приход кеты",
	occurredOn: "2026-09-03",
	quantityKg: 300,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

afterEach(() => {
	vi.clearAllMocks();
});

describe("DirectAccountingHome", () => {
	it("opens a ledger row for inline correction", async () => {
		vi.mocked(listDirectAccountingEntries).mockResolvedValue({ entries: [sale] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [sale.productName] });
		vi.mocked(updateDirectAccountingSale).mockResolvedValue({ sale: { ...saleResponse, unitPriceCents: 130_000 } });

		renderHome();
		fireEvent.click(await screen.findByRole("button", { name: /Икра кеты/ }));
		expect(screen.getByText("Исправление продажи")).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Наименование")));
		expect(screen.getByRole("button", { name: "Удалить продажу" }).textContent).toContain("Удалить");
		fireEvent.change(screen.getByLabelText("Цена за кг, ₽"), { target: { value: "1300" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }));

		await waitFor(() => {
			expect(updateDirectAccountingSale).toHaveBeenCalledWith("sale1", {
				productName: "Икра кеты",
				soldOn: "2026-09-08",
				quantityKg: 2.5,
				unitPriceCents: 130_000,
			});
		});
	});

	it("creates a decimal-kilogram sale", async () => {
		vi.mocked(listDirectAccountingEntries).mockResolvedValue({ entries: [] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [] });
		vi.mocked(createDirectAccountingSale).mockResolvedValue({ sale: saleResponse });

		renderHome();
		fireEvent.change(screen.getByLabelText("Наименование"), { target: { value: "Икра кеты" } });
		fireEvent.change(screen.getByLabelText("Количество, кг"), { target: { value: "2,5" } });
		fireEvent.change(screen.getByLabelText("Цена за кг, ₽"), { target: { value: "1200" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить продажу" }));

		await waitFor(() => {
			expect(createDirectAccountingSale).toHaveBeenCalledWith(expect.objectContaining({
				productName: "Икра кеты",
				quantityKg: 2.5,
				unitPriceCents: 120_000,
			}));
		});
		expect(deleteDirectAccountingSale).not.toHaveBeenCalled();
	});

	it("creates a backdated receipt without asking for a price", async () => {
		vi.mocked(listDirectAccountingEntries).mockResolvedValue({ entries: [] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [] });
		vi.mocked(createDirectAccountingReceipt).mockResolvedValue({ receipt: {
			id: "receipt1",
			productName: "Икра кеты",
			receivedOn: "2026-09-03",
			quantityKg: 300,
			createdAt: new Date(0).toISOString(),
			updatedAt: new Date(0).toISOString(),
		} });

		renderHome();
		fireEvent.click(screen.getByRole("button", { name: "Приход" }));
		expect(screen.queryByLabelText("Цена за кг, ₽")).toBeNull();
		fireEvent.change(screen.getByLabelText("Наименование"), { target: { value: "Икра кеты" } });
		fireEvent.change(screen.getByLabelText("Дата"), { target: { value: "2026-09-03" } });
		expect(screen.getByText("03.09.2026")).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Количество, кг"), { target: { value: "300" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить приход" }));

		await waitFor(() => expect(createDirectAccountingReceipt).toHaveBeenCalledWith({
			productName: "Икра кеты",
			receivedOn: "2026-09-03",
			quantityKg: 300,
		}));
	});

	it("filters the ledger and names it by the selected operation type", async () => {
		vi.mocked(listDirectAccountingEntries).mockResolvedValue({ entries: [sale, receipt] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [] });

		renderHome();
		expect(await screen.findByText("Продажи за 30 дней")).toBeTruthy();
		expect(await screen.findByText("1 продажа")).toBeTruthy();
		expect(screen.queryByText(receipt.productName)).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Приход" }));
		expect(screen.getByText("Приходы за 30 дней")).toBeTruthy();
		expect(screen.getByText("Новый приход")).toBeTruthy();
		expect(screen.getByText("1 приход")).toBeTruthy();
		expect(screen.getByText(receipt.productName)).toBeTruthy();
		expect(screen.queryByText(sale.productName)).toBeNull();
	});
});

function renderHome() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<DirectAccountingHome online />
		</QueryClientProvider>,
	);
}
