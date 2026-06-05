type SaleSubmitBlockReasonInput = {
	availableQuantity: number | undefined;
	hasClient: boolean;
	hasProduct: boolean;
	hasProductOptions: boolean;
	loadingOptions: boolean;
	online: boolean;
	pending: boolean;
	quantity: number;
};

type LoadSubmitBlockReasonInput = {
	availableQuantity: number | undefined;
	hasProduct: boolean;
	hasProductOptions: boolean;
	loadingOptions: boolean;
	online: boolean;
	pending: boolean;
	quantity: number;
};

export function getSaleSubmitBlockReason({
	availableQuantity,
	hasClient,
	hasProduct,
	hasProductOptions,
	loadingOptions,
	online,
	pending,
	quantity,
}: SaleSubmitBlockReasonInput): string {
	if (!online) {
		return "Нет соединения.";
	}
	if (pending) {
		return "Записываем продажу.";
	}
	if (loadingOptions) {
		return "Загружаем продукцию.";
	}
	if (!hasProductOptions) {
		return "Нет продукции для продажи.";
	}
	if (!hasClient) {
		return "Выберите клиента.";
	}
	if (!hasProduct) {
		return "Выберите продукцию.";
	}

	return getQuantityBlockReason(quantity, availableQuantity);
}

export function getLoadSubmitBlockReason({
	availableQuantity,
	hasProduct,
	hasProductOptions,
	loadingOptions,
	online,
	pending,
	quantity,
}: LoadSubmitBlockReasonInput): string {
	if (!online) {
		return "Нет соединения.";
	}
	if (pending) {
		return "Записываем загрузку.";
	}
	if (loadingOptions) {
		return "Загружаем продукцию.";
	}
	if (!hasProductOptions) {
		return "Нет продукции для загрузки.";
	}
	if (!hasProduct) {
		return "Выберите продукцию.";
	}

	return getQuantityBlockReason(quantity, availableQuantity);
}

function getQuantityBlockReason(quantity: number, availableQuantity: number | undefined): string {
	if (!Number.isInteger(quantity) || quantity <= 0) {
		return "Укажите количество.";
	}
	if (availableQuantity !== undefined && quantity > availableQuantity) {
		return "Количество больше доступного остатка.";
	}

	return "";
}
