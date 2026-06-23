import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
	createDefaultProductQuantityState,
	ProductQuantityInputField,
	type ProductQuantityInputState,
} from "./product-quantity-input";

describe("ProductQuantityInputField", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders lowercase mode buttons with pressed state", () => {
		renderQuantityInput();

		expect(screen.getByRole("button", { name: "кг" }).getAttribute("aria-pressed")).toBe("true");
		expect(screen.getByRole("button", { name: "шт" }).getAttribute("aria-pressed")).toBe("false");
		expect(screen.queryByRole("button", { name: "Кг" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Шт" })).toBeNull();
	});

	it("converts valid kilograms to units when switching modes", () => {
		renderQuantityInput();

		fireEvent.change(screen.getByLabelText("Количество, кг"), { target: { value: "0.4" } });
		expect(screen.getByText("2 шт")).toBeTruthy();
		expect(document.querySelector(".product-quantity-hint")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "шт" }));

		expect(screen.getByRole("button", { name: "кг" }).getAttribute("aria-pressed")).toBe("false");
		expect(screen.getByRole("button", { name: "шт" }).getAttribute("aria-pressed")).toBe("true");
		expect((screen.getByLabelText("Количество, шт") as HTMLInputElement).value).toBe("2");
		expect(screen.getByText("0,4 кг")).toBeTruthy();
	});

	it("converts valid units back to kilograms when switching modes", () => {
		renderQuantityInput({ initialState: { mode: "units", value: "2" } });

		fireEvent.click(screen.getByRole("button", { name: "кг" }));

		expect((screen.getByLabelText("Количество, кг") as HTMLInputElement).value).toBe("0,4");
	});

	it("keeps quantity unavailable until product context provides net weight", () => {
		renderQuantityInput({ netWeightGrams: 0 });

		expect((screen.getByRole("button", { name: "кг" }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole("button", { name: "шт" }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByLabelText("Количество, кг") as HTMLInputElement).disabled).toBe(true);
		expect(document.querySelector(".product-quantity-hint")).toBeNull();
	});
});

function renderQuantityInput({
	initialState = createDefaultProductQuantityState(),
	netWeightGrams = 200,
}: {
	initialState?: ProductQuantityInputState;
	netWeightGrams?: number | undefined;
} = {}) {
	function Harness() {
		const [state, setState] = useState<ProductQuantityInputState>(initialState);

		return (
			<ProductQuantityInputField
				id="quantity"
				label="Количество"
				netWeightGrams={netWeightGrams}
				onChange={setState}
				state={state}
			/>
		);
	}

	render(<Harness />);
}
