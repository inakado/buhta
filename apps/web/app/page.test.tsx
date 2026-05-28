import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const adminActorResponse = {
	authenticated: true,
	actor: {
		userId: "seed-admin",
		login: "admin",
		displayName: "Admin",
		role: "admin",
		permissions: ["users.manage"],
	},
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

describe("HomePage", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders the CRM app entry", () => {
		render(<HomePage />);
		expect(screen.getByText("Загрузка Бухты")).toBeTruthy();
	});

	it("moves an authenticated admin to the login form after logout", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);

			if (url.endsWith("/auth/me")) {
				return jsonResponse(adminActorResponse);
			}

			if (url.endsWith("/users")) {
				return jsonResponse({ users: [] });
			}

			if (url.endsWith("/api/auth/sign-out")) {
				return jsonResponse({ success: true });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Настройки" }));
		fireEvent.click(await screen.findByRole("button", { name: "Выйти" }));

		expect(await screen.findByText("Логин")).toBeTruthy();
		expect(screen.getByText("Пароль")).toBeTruthy();

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/auth/sign-out"),
				expect.objectContaining({ method: "POST" }),
			);
		});
	});
});
