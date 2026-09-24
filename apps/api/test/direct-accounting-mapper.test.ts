import { describe, expect, it } from "vitest";
import { calculateDirectAccountingSalaryAmountCents } from "../src/direct-accounting/direct-accounting.mapper";

describe("direct accounting salary calculation", () => {
	it("calculates percentage in basis points and rounds half up to kopecks", () => {
		expect(calculateDirectAccountingSalaryAmountCents(1_000_000, 500)).toBe(50_000);
		expect(calculateDirectAccountingSalaryAmountCents(101, 500)).toBe(5);
		expect(calculateDirectAccountingSalaryAmountCents(110, 500)).toBe(6);
	});

	it("rejects a result below one kopeck", () => {
		expect(() => calculateDirectAccountingSalaryAmountCents(1, 1)).toThrow("допустимый числовой диапазон");
	});
});
