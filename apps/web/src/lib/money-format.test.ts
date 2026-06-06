import { describe, expect, it } from "vitest";
import { formatCompactMoneyCents, formatCompactRubles, formatRubles } from "./money-format";

describe("money-format", () => {
	it("keeps exact ruble display for regular money values", () => {
		expect(formatRubles(125000)).toBe("1250.00\u00A0₽");
		expect(formatRubles(125050)).toBe("1250.50\u00A0₽");
	});

	it("removes trailing zero kopecks for compact summary values", () => {
		expect(formatCompactMoneyCents(125000)).toBe("1250");
		expect(formatCompactMoneyCents(125050)).toBe("1250.50");
		expect(formatCompactRubles(125000)).toBe("1250\u00A0₽");
		expect(formatCompactRubles(125050)).toBe("1250.50\u00A0₽");
	});
});
