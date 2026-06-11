import { describe, expect, it } from "vitest";
import { toUserErrorMessage } from "./error-messages";

describe("toUserErrorMessage", () => {
	it("translates BetterAuth invalid login message", () => {
		expect(toUserErrorMessage("Invalid username or password")).toBe("Неверный логин или пароль");
	});

	it("translates common request status fallbacks", () => {
		expect(toUserErrorMessage("Request failed: 403")).toBe("Недостаточно прав для этого действия");
	});

	it("translates self password reset restriction", () => {
		expect(toUserErrorMessage("Admin cannot reset own password")).toBe("Нельзя сбросить пароль самому себе");
	});

	it("translates self role update restriction", () => {
		expect(toUserErrorMessage("Admin cannot change own role")).toBe("Нельзя изменить собственную роль");
	});

	it("translates wrong current password", () => {
		expect(toUserErrorMessage("Current password is incorrect")).toBe("Текущий пароль указан неверно");
	});

	it("keeps unknown backend messages visible", () => {
		expect(toUserErrorMessage("Логин уже занят")).toBe("Логин уже занят");
	});
});
