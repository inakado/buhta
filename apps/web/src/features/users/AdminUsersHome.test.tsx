import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminUsersHome } from "./AdminUsersHome";
import { updateUserIdentity } from "../../lib/api-client";

vi.mock("../../lib/api-client", () => ({
	createUser: vi.fn(),
	listUsers: vi.fn().mockResolvedValue({
		users: [
			{
				id: "admin-1",
				name: "Admin",
				login: "admin",
				role: "admin",
				createdAt: new Date(0).toISOString(),
				updatedAt: new Date(0).toISOString(),
			},
			{
				id: "user-1",
				name: "Nikita",
				login: "director",
				role: "director",
				createdAt: new Date(0).toISOString(),
				updatedAt: new Date(0).toISOString(),
			},
		],
	}),
	resetUserPassword: vi.fn(),
	updateUserIdentity: vi.fn().mockResolvedValue({
		user: {
			id: "user-1",
			name: "Nikita Ivanov",
			login: "nikita",
			role: "director",
			createdAt: new Date(0).toISOString(),
			updatedAt: new Date(0).toISOString(),
		},
	}),
	updateUserRole: vi.fn(),
}));

const actor = {
	userId: "admin-1",
	login: "admin",
	displayName: "Admin",
	role: "admin" as const,
	permissions: ["users.manage"],
};

describe("AdminUsersHome", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("lets admin edit a user's name and login from the access list", async () => {
		renderAdminUsersHome();

		const editButton = await screen.findByRole("button", { name: "Изменить пользователя Nikita" });
		fireEvent.click(editButton);

		fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Nikita Ivanov" } });
		fireEvent.change(screen.getByLabelText("Логин"), { target: { value: "nikita" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(updateUserIdentity).toHaveBeenCalledWith("user-1", {
				name: "Nikita Ivanov",
				login: "nikita",
			});
		});
	});

	it("shows login conflict errors in the edit dialog", async () => {
		vi.mocked(updateUserIdentity).mockRejectedValueOnce(new Error("Логин уже занят"));

		renderAdminUsersHome();

		const editButton = await screen.findByRole("button", { name: "Изменить пользователя Nikita" });
		fireEvent.click(editButton);
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(await screen.findByText("Логин уже занят")).toBeTruthy();
	});
});

function renderAdminUsersHome() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<AdminUsersHome actor={actor} onActionSuccess={vi.fn()} online />
		</QueryClientProvider>,
	);
}
