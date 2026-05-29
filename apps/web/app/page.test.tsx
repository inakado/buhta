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
		permissions: ["users.manage", "catalog.manage"],
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

	it("renders catalog management for an admin and submits raw material type", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.endsWith("/auth/me")) {
				return jsonResponse(adminActorResponse);
			}

			if (url.endsWith("/users")) {
				return jsonResponse({ users: [] });
			}

			if (url.endsWith("/catalog/raw-material-types") && method === "POST") {
				return jsonResponse({
					rawMaterialType: {
						id: "raw1",
						name: "Горбуша",
						unit: "кг",
						active: true,
						createdAt: new Date(0).toISOString(),
						updatedAt: new Date(0).toISOString(),
					},
				});
			}

			if (url.endsWith("/catalog/raw-material-types")) {
				return jsonResponse({ rawMaterialTypes: [] });
			}

			if (url.endsWith("/catalog/packaging-types")) {
				return jsonResponse({ packagingTypes: [] });
			}

			if (url.endsWith("/catalog/distributors")) {
				return jsonResponse({ distributors: [] });
			}

			if (url.endsWith("/catalog/product-templates")) {
				return jsonResponse({ productTemplates: [] });
			}

			return jsonResponse({ error: { message: "Unexpected request" } }, 500);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<HomePage />);

		fireEvent.click(await screen.findByRole("button", { name: "Каталог" }));
		fireEvent.change(await screen.findByLabelText("Название"), { target: { value: "Горбуша" } });
		fireEvent.change(screen.getByLabelText("Единица измерения"), { target: { value: "кг" } });
		fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/catalog/raw-material-types"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ name: "Горбуша", unit: "кг" }),
				}),
			);
		});
	});
});
