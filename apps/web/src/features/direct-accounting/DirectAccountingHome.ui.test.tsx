import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectAccountingHome } from "./DirectAccountingHome";
import {
	createDirectAccountingExpense,
	createDirectAccountingReceipt,
	createDirectAccountingSale,
	createDirectAccountingTransfer,
	deleteDirectAccountingSale,
	listDirectAccountingEntries,
	listDirectAccountingSuggestions,
	updateDirectAccountingSale,
} from "../../lib/api-client";

vi.mock("../../lib/api-client", () => ({
	createDirectAccountingExpense: vi.fn(),
	createDirectAccountingReceipt: vi.fn(),
	createDirectAccountingSale: vi.fn(),
	createDirectAccountingTransfer: vi.fn(),
	deleteDirectAccountingExpense: vi.fn(),
	deleteDirectAccountingReceipt: vi.fn(),
	deleteDirectAccountingSale: vi.fn(),
	deleteDirectAccountingTransfer: vi.fn(),
	listDirectAccountingEntries: vi.fn(),
	listDirectAccountingSuggestions: vi.fn(),
	updateDirectAccountingExpense: vi.fn(),
	updateDirectAccountingReceipt: vi.fn(),
	updateDirectAccountingSale: vi.fn(),
	updateDirectAccountingTransfer: vi.fn(),
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

const expense = {
	kind: "expense" as const,
	id: "expense1",
	name: "Доставка",
	occurredOn: "2026-09-02",
	amountCents: 25_000,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

const transfer = {
	kind: "transfer" as const,
	id: "transfer1",
	comment: "Ивану на закупку",
	occurredOn: "2026-09-01",
	amountCents: 50_000,
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
		vi.mocked(listDirectAccountingEntries).mockResolvedValue({ entries: [sale, receipt, expense, transfer] });
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

		fireEvent.click(screen.getByRole("button", { name: "Затраты" }));
		expect(screen.getByText("Затраты за 30 дней")).toBeTruthy();
		expect(screen.getByText("Новая затрата")).toBeTruthy();
		expect(screen.getByText("1 затрата")).toBeTruthy();
		expect(screen.getByText(expense.name)).toBeTruthy();
		expect(screen.getByText("250 ₽")).toBeTruthy();
		expect(screen.queryByLabelText("Количество, кг")).toBeNull();
		expect(screen.queryByLabelText("Цена за кг, ₽")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Передача" }));
		expect(screen.getByText("Передачи за 30 дней")).toBeTruthy();
		expect(screen.getByText("Новая передача средств")).toBeTruthy();
		expect(screen.getByText("1 передача")).toBeTruthy();
		expect(screen.getByText(transfer.comment)).toBeTruthy();
		expect(screen.getByText("500 ₽")).toBeTruthy();
		expect(screen.getByLabelText("Кому / комментарий")).toBeTruthy();
		expect(screen.queryByLabelText("Количество, кг")).toBeNull();
		expect(screen.queryByLabelText("Цена за кг, ₽")).toBeNull();
	});

	it("creates a backdated expense with an amount only", async () => {
		vi.mocked(listDirectAccountingEntries).mockResolvedValue({ entries: [] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [] });
		vi.mocked(createDirectAccountingExpense).mockResolvedValue({ expense: {
			id: expense.id,
			name: expense.name,
			spentOn: expense.occurredOn,
			amountCents: expense.amountCents,
			createdAt: expense.createdAt,
			updatedAt: expense.updatedAt,
		} });

		renderHome();
		fireEvent.click(screen.getByRole("button", { name: "Затраты" }));
		fireEvent.change(screen.getByLabelText("Наименование"), { target: { value: "Доставка" } });
		fireEvent.change(screen.getByLabelText("Дата"), { target: { value: "2026-09-02" } });
		fireEvent.change(screen.getByLabelText("Сумма, ₽"), { target: { value: "250" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить затрату" }));

		await waitFor(() => expect(createDirectAccountingExpense).toHaveBeenCalledWith({
			name: "Доставка",
			spentOn: "2026-09-02",
			amountCents: 25_000,
		}));
	});

	it("creates a backdated transfer with a comment and amount", async () => {
		vi.mocked(listDirectAccountingEntries).mockResolvedValue({ entries: [] });
		vi.mocked(listDirectAccountingSuggestions).mockResolvedValue({ suggestions: [] });
		vi.mocked(createDirectAccountingTransfer).mockResolvedValue({ transfer: {
			id: transfer.id,
			comment: transfer.comment,
			transferredOn: transfer.occurredOn,
			amountCents: transfer.amountCents,
			createdAt: transfer.createdAt,
			updatedAt: transfer.updatedAt,
		} });

		renderHome();
		fireEvent.click(screen.getByRole("button", { name: "Передача" }));
		fireEvent.change(screen.getByLabelText("Кому / комментарий"), { target: { value: transfer.comment } });
		fireEvent.change(screen.getByLabelText("Дата"), { target: { value: transfer.occurredOn } });
		fireEvent.change(screen.getByLabelText("Сумма, ₽"), { target: { value: "500" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить передачу" }));

		await waitFor(() => expect(createDirectAccountingTransfer).toHaveBeenCalledWith({
			comment: transfer.comment,
			transferredOn: transfer.occurredOn,
			amountCents: transfer.amountCents,
		}));
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
