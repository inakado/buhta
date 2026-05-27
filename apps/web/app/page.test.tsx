import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
	it("renders foundation status", async () => {
		render(await HomePage());
		expect(screen.getByRole("heading", { name: "Бухта CRM" })).toBeTruthy();
		expect(screen.getByText("Foundation")).toBeTruthy();
	});
});
