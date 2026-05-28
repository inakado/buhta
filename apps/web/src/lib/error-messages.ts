const DEFAULT_ERROR_MESSAGE = "Не удалось выполнить действие. Попробуйте еще раз.";

const EXACT_ERROR_MESSAGES: Record<string, string> = {
	"Invalid username or password": "Неверный логин или пароль",
	"Admin cannot change own role": "Нельзя изменить собственную роль",
	"Admin cannot reset own password": "Нельзя сбросить пароль самому себе",
	"Request failed: 400": "Некорректные данные. Проверьте поля и попробуйте еще раз.",
	"Request failed: 401": "Нужно войти в систему",
	"Request failed: 403": "Недостаточно прав для этого действия",
	"Request failed: 404": "Запись не найдена",
	"Request failed: 409": "Такая запись уже существует",
	"Request failed: 500": "Ошибка сервера. Попробуйте позже.",
};

const PARTIAL_ERROR_MESSAGES: Array<[RegExp, string]> = [
	[/invalid username or password/i, "Неверный логин или пароль"],
	[/failed to fetch|networkerror|network request failed/i, "Нет соединения с сервером"],
	[/duplicate|unique constraint/i, "Такая запись уже существует"],
];

export function toUserErrorMessage(message: unknown): string {
	if (typeof message !== "string" || !message.trim()) {
		return DEFAULT_ERROR_MESSAGE;
	}

	const normalizedMessage = message.trim();
	const exactMessage = EXACT_ERROR_MESSAGES[normalizedMessage];

	if (exactMessage) {
		return exactMessage;
	}

	for (const [pattern, translatedMessage] of PARTIAL_ERROR_MESSAGES) {
		if (pattern.test(normalizedMessage)) {
			return translatedMessage;
		}
	}

	return normalizedMessage;
}
