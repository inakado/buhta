import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectAccountingHome } from "./DirectAccountingHome";
import {
	createDirectAccountingSale,
	deleteDirectAccountingSale,
	listDirectAccountingSales,
	listDirectAccountingSuggestions,
	updateDirectAccountingSale,
} from "../../lib/api-client";

vi.mock("../../lib/api-client", () => ({
	createDirectAccountingSale: vi.fn(),
	deleteDirectAccountingSale: vi.fn(),
	listDirectAccountingSales: vi.fn(),
	listDirectAccountingSuggestions: vi.fn(),
	updateDirectAccountingSale: vi.fn(),
}));

const sale = {
	id: "sale1",
	productName: "Икра кеты",
	soldOn: "2026-09-08",
	quantityKg: 2.5,
	unitPriceCents: 120_000,
	totalCents: 300_000,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

afterEach(() => {
	vi.clearAllMocks();
});

describe("DirectAccountingHome", () => {
	it("opens a ledger row for inline correction", async () => {
		vi.mocked(listDirectAccountingSales).mockResolvedValue({ sales: [sale] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [sale.productName] });
		vi.mocked(updateDirectAccountingSale).mockResolvedValue({ sale: { ...sale, unitPriceCents: 130_000 } });

		renderHome();
		fireEvent.click(await screen.findByRole("button", { name: /Икра кеты/ }));
		expect(screen.getByText("Исправление записи")).toBeTruthy();
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
		vi.mocked(listDirectAccountingSales).mockResolvedValue({ sales: [] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [] });
		vi.mocked(createDirectAccountingSale).mockResolvedValue({ sale });

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
});

function renderHome() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<DirectAccountingHome online />
		</QueryClientProvider>,
	);
}
