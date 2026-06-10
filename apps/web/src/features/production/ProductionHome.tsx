"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
	ArrowRightLeft,
	ArrowLeft,
	Check,
	Factory,
} from "lucide-react";
import {
	type Distributor,
	type PackagingType,
	type ProductBatch,
	type ProductTemplate,
	type ProductionBalanceItem,
	type RawMaterialType,
	type WorkshopProductBalanceItem,
} from "@buhta/shared";
import {
	createPackagingIntake,
	createProductBatch,
	createProductTransfer,
	createRawMaterialIntake,
	getProductionOptions,
	getProductionSummary,
	getProductionTransferOptions,
	listPackagingBalances,
	listProductBatches,
	listRawMaterialBalances,
	listWorkshopProductBalances,
} from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { ProductionHomeOverview } from "./ProductionHomeOverview";

const PRODUCTION_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	month: "2-digit",
});

type ProductionTab = "home" | "history";
type ProductionScreen = "raw-intake" | "packaging-intake" | "batch-release" | "transfer" | "raw-stock" | "packaging-stock" | "products";
type SuccessNotice = {
	id: number;
	message: string;
};

type ProductBatchFormState = {
	productTemplateId: string;
	quantity: string;
	rawQuantity: string;
	comment: string;
	localError: string;
};

type ProductTransferFormState = {
	productBatchId: string;
	distributorId: string;
	quantity: string;
	comment: string;
	localError: string;
};

type FormAction<State> =
	| { type: "patch"; values: Partial<State> }
	| { type: "reset" };

const EMPTY_PRODUCT_BATCH_FORM: ProductBatchFormState = {
	productTemplateId: "",
	quantity: "",
	rawQuantity: "",
	comment: "",
	localError: "",
};

const EMPTY_PRODUCT_TRANSFER_FORM: ProductTransferFormState = {
	productBatchId: "",
	distributorId: "",
	quantity: "",
	comment: "",
	localError: "",
};

function productBatchFormReducer(
	state: ProductBatchFormState,
	action: FormAction<ProductBatchFormState>,
): ProductBatchFormState {
	if (action.type === "reset") {
		return EMPTY_PRODUCT_BATCH_FORM;
	}

	return { ...state, ...action.values };
}

function productTransferFormReducer(
	state: ProductTransferFormState,
	action: FormAction<ProductTransferFormState>,
): ProductTransferFormState {
	if (action.type === "reset") {
		return EMPTY_PRODUCT_TRANSFER_FORM;
	}

	return { ...state, ...action.values };
}

export function ProductionHome({
	activeTab,
	online,
}: {
	activeTab: ProductionTab;
	online: boolean;
}) {
	const [activeScreen, setActiveScreen] = useState<ProductionScreen | null>(null);
	const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
	const successNoticeId = useRef(0);
	const {
		data: summary,
		isLoading: summaryLoading,
	} = useQuery({
		queryKey: ["production", "summary"],
		queryFn: getProductionSummary,
	});
	const {
		data: rawMaterialBalances,
		isLoading: rawMaterialBalancesLoading,
	} = useQuery({
		queryKey: ["production", "raw-material-balances"],
		queryFn: listRawMaterialBalances,
	});
	const {
		data: packagingBalances,
		isLoading: packagingBalancesLoading,
	} = useQuery({
		queryKey: ["production", "packaging-balances"],
		queryFn: listPackagingBalances,
	});
	const {
		data: productBatches,
		isLoading: productBatchesLoading,
	} = useQuery({
		queryKey: ["production", "product-batches"],
		queryFn: listProductBatches,
	});
	const {
		data: workshopProductBalances,
		isLoading: workshopProductBalancesLoading,
	} = useQuery({
		queryKey: ["production", "workshop-product-balances"],
		queryFn: listWorkshopProductBalances,
	});
	const {
		data: transferOptions,
		isLoading: transferOptionsLoading,
	} = useQuery({
		queryKey: ["production", "transfer-options"],
		queryFn: getProductionTransferOptions,
	});
	const { data: options } = useQuery({
		queryKey: ["production", "options"],
		queryFn: getProductionOptions,
	});

	if (activeTab !== "home" && activeScreen !== null) {
		setActiveScreen(null);
	}

	useEffect(() => {
		if (!successNotice) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setSuccessNotice((current) => current?.id === successNotice.id ? null : current);
		}, 3000);

		return () => window.clearTimeout(timeoutId);
	}, [successNotice]);

	function handleActionSuccess(message: string) {
		successNoticeId.current += 1;
		setActiveScreen(null);
		setSuccessNotice({
			id: successNoticeId.current,
			message,
		});
	}

	if (activeTab === "home" && activeScreen) {
		return (
			<ProductionDetailScreen
				mode={activeScreen}
				onBack={() => setActiveScreen(null)}
				onActionSuccess={handleActionSuccess}
				online={online}
				packagingBalances={packagingBalances?.packagingBalances ?? []}
				packagingBalancesLoading={packagingBalancesLoading}
				packagingTypes={options?.packagingTypes ?? []}
				productTemplates={options?.productTemplates ?? []}
				rawMaterialBalances={rawMaterialBalances?.rawMaterialBalances ?? []}
				rawMaterialBalancesLoading={rawMaterialBalancesLoading}
				rawMaterialTypes={options?.rawMaterialTypes ?? []}
				transferDistributors={transferOptions?.distributors ?? []}
				transferOptionsLoading={transferOptionsLoading}
				transferWorkshopProductBalances={transferOptions?.workshopProductBalances ?? []}
				workshopProductBalances={workshopProductBalances?.workshopProductBalances ?? []}
				workshopProductBalancesLoading={workshopProductBalancesLoading}
			/>
		);
	}

	if (activeTab === "history") {
		return (
			<ProductionHistory
				loading={productBatchesLoading}
				productBatches={productBatches?.productBatches ?? []}
			/>
		);
	}

	const summaryValue = summary?.summary;

	return (
		<section className="screen-stack">
			<ProductionHomeOverview
				loading={summaryLoading}
				onOpenBatchRelease={() => setActiveScreen("batch-release")}
				onOpenPackaging={() => setActiveScreen("packaging-stock")}
				onOpenPackagingIntake={() => setActiveScreen("packaging-intake")}
				onOpenProducts={() => setActiveScreen("products")}
				onOpenRawIntake={() => setActiveScreen("raw-intake")}
				onOpenRawMaterials={() => setActiveScreen("raw-stock")}
				onOpenTransfer={() => setActiveScreen("transfer")}
				online={online}
				packagingKinds={summaryValue?.packagingKinds ?? 0}
				packagingLabel={`${formatQuantity(summaryValue?.packagingTotal ?? 0)} ${summaryValue?.packagingUnit ?? "шт"}`}
				rawMaterialKinds={summaryValue?.rawMaterialKinds ?? 0}
				rawMaterialLabel={`${formatQuantity(summaryValue?.rawMaterialTotal ?? 0)} ${summaryValue?.rawMaterialUnit ?? "кг"}`}
				readyProductUnits={summaryValue?.readyProductUnits ?? 0}
			/>

			{successNotice ? <ProductionSuccessNotice notice={successNotice} /> : null}
		</section>
	);
}

function ProductionDetailScreen({
	mode,
	onActionSuccess,
	onBack,
	online,
	packagingBalances,
	packagingBalancesLoading,
	packagingTypes,
	productTemplates,
	rawMaterialBalances,
	rawMaterialBalancesLoading,
	rawMaterialTypes,
	transferDistributors,
	transferOptionsLoading,
	transferWorkshopProductBalances,
	workshopProductBalances,
	workshopProductBalancesLoading,
}: {
	mode: ProductionScreen;
	onActionSuccess: (message: string) => void;
	onBack: () => void;
	online: boolean;
	packagingBalances: ProductionBalanceItem[];
	packagingBalancesLoading: boolean;
	packagingTypes: PackagingType[];
	productTemplates: ProductTemplate[];
	rawMaterialBalances: ProductionBalanceItem[];
	rawMaterialBalancesLoading: boolean;
	rawMaterialTypes: RawMaterialType[];
	transferDistributors: Distributor[];
	transferOptionsLoading: boolean;
	transferWorkshopProductBalances: WorkshopProductBalanceItem[];
	workshopProductBalances: WorkshopProductBalanceItem[];
	workshopProductBalancesLoading: boolean;
}) {
	const activeRawMaterialTypes = useMemo(() => rawMaterialTypes.filter((item) => item.active), [rawMaterialTypes]);
	const activePackagingTypes = useMemo(() => packagingTypes.filter((item) => item.active), [packagingTypes]);
	const activeProductTemplates = useMemo(
		() => productTemplates.filter((item) => item.active && item.priceCents > 0),
		[productTemplates],
	);
	const rawStockItems = useMemo(
		() => buildStockItems(activeRawMaterialTypes, rawMaterialBalances),
		[activeRawMaterialTypes, rawMaterialBalances],
	);
	const packagingStockItems = useMemo(
		() => buildStockItems(activePackagingTypes, packagingBalances),
		[activePackagingTypes, packagingBalances],
	);

	return (
		<section className="screen-stack production-detail-screen">
			<div className="section-heading action-heading">
				<button className="secondary-button production-back-button" onClick={onBack} type="button">
					<ArrowLeft aria-hidden size={16} />
					<span>Назад</span>
				</button>
			</div>

			{mode === "raw-intake" ? (
				<IntakeForm
					emptyText="Сначала директор или администратор должен добавить активный вид сырья."
					items={activeRawMaterialTypes}
					kind="raw"
					onActionSuccess={onActionSuccess}
					online={online}
					title="Приход сырья"
				/>
			) : null}
			{mode === "packaging-intake" ? (
				<IntakeForm
					emptyText="Сначала директор или администратор должен добавить активный вид тары."
					items={activePackagingTypes}
					kind="packaging"
					onActionSuccess={onActionSuccess}
					online={online}
					title="Приход тары"
				/>
			) : null}
			{mode === "batch-release" ? (
				<ProductBatchForm
					onActionSuccess={onActionSuccess}
					online={online}
					packagingBalances={packagingBalances}
					packagingBalancesLoading={packagingBalancesLoading}
					productTemplates={activeProductTemplates}
					rawMaterialBalances={rawMaterialBalances}
					rawMaterialBalancesLoading={rawMaterialBalancesLoading}
				/>
			) : null}
			{mode === "transfer" ? (
				<ProductTransferForm
					distributors={transferDistributors}
					loading={transferOptionsLoading}
					onActionSuccess={onActionSuccess}
					online={online}
					workshopProductBalances={transferWorkshopProductBalances}
				/>
			) : null}
			{mode === "raw-stock" ? (
				<StockListScreen
					emptyText="Сырья пока нет. Добавьте первый приход сырья."
					items={rawStockItems}
					loading={rawMaterialBalancesLoading}
					title="Сырье"
				/>
			) : null}
			{mode === "packaging-stock" ? (
				<StockListScreen
					emptyText="Тары пока нет. Добавьте первый приход тары."
					items={packagingStockItems}
					loading={packagingBalancesLoading}
					title="Тара"
				/>
			) : null}
			{mode === "products" ? (
				<ProductStockScreen
					loading={workshopProductBalancesLoading}
					workshopProductBalances={workshopProductBalances}
				/>
			) : null}
		</section>
	);
}

function IntakeForm({
	emptyText,
	items,
	kind,
	onActionSuccess,
	online,
	title,
}: {
	emptyText: string;
	items: Array<RawMaterialType | PackagingType>;
	kind: "raw" | "packaging";
	onActionSuccess: (message: string) => void;
	online: boolean;
	title: string;
}) {
	const queryClient = useQueryClient();
	const [typeId, setTypeId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
	const mutation = useMutation({
		mutationFn: async (): Promise<unknown> => {
			if (kind === "raw") {
				return createRawMaterialIntake({
					rawMaterialTypeId: typeId,
					quantity: parsePositiveNumber(quantity, "Количество"),
					...(comment.trim() ? { comment: comment.trim() } : {}),
				});
			}

			return createPackagingIntake({
				packagingTypeId: typeId,
				quantity: parsePositiveNumber(quantity, "Количество"),
				...(comment.trim() ? { comment: comment.trim() } : {}),
			});
		},
		onSuccess: async () => {
			setTypeId("");
			setQuantity("");
			setComment("");
			setLocalError("");
			await invalidateProduction(queryClient);
			onActionSuccess(kind === "raw" ? "Сырье добавлено" : "Тара добавлена");
		},
	});
	const selectedItem = items.find((item) => item.id === typeId);
	const intakeSubmitDisabled = !online || items.length === 0 || mutation.isPending;
	const intakeSubmitBlockReason = !online
		? "Нет сети: операция записи недоступна."
		: items.length === 0
			? emptyText
			: mutation.isPending
				? "Записываем приход"
				: "";

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		try {
			parsePositiveNumber(quantity, "Количество");
		} catch (error) {
			setLocalError(error instanceof Error ? error.message : "Проверьте количество.");
			return;
		}
		setLocalError("");
		mutation.mutate();
	}

	return (
		<form className="form-panel production-action-form" onSubmit={handleSubmit}>
			<ProductionFormHeading title={title} meta={selectedItem?.unit} />
			<label className="field">
				<span>{kind === "raw" ? "Вид сырья" : "Вид тары"}</span>
				<select onChange={(event) => setTypeId(event.target.value)} required value={typeId}>
					<option value="">Выберите запись</option>
					{items.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</label>
			<label className="field">
				<span>Количество</span>
				<input
					inputMode="decimal"
					onChange={(event) => setQuantity(event.target.value)}
					placeholder={kind === "raw" ? "25.5" : "120"}
					required
					type="text"
					value={quantity}
				/>
			</label>
			<label className="field">
				<span>Комментарий</span>
				<input onChange={(event) => setComment(event.target.value)} type="text" value={comment} />
			</label>
			{localError ? <p className="form-error">{localError}</p> : null}
			{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
			<ProductionSubmitBlock blockReason={intakeSubmitBlockReason}>
				<button className="primary-button" disabled={intakeSubmitDisabled} type="submit">
					<Check aria-hidden size={18} />
					Записать приход
				</button>
			</ProductionSubmitBlock>
		</form>
	);
}

function ProductBatchForm({
	onActionSuccess,
	online,
	packagingBalances,
	packagingBalancesLoading,
	productTemplates,
	rawMaterialBalances,
	rawMaterialBalancesLoading,
}: {
	onActionSuccess: (message: string) => void;
	online: boolean;
	packagingBalances: ProductionBalanceItem[];
	packagingBalancesLoading: boolean;
	productTemplates: ProductTemplate[];
	rawMaterialBalances: ProductionBalanceItem[];
	rawMaterialBalancesLoading: boolean;
}) {
	const queryClient = useQueryClient();
	const [form, dispatchForm] = useReducer(productBatchFormReducer, EMPTY_PRODUCT_BATCH_FORM);
	const { comment, localError, productTemplateId, quantity, rawQuantity } = form;
	const selectedTemplate = productTemplates.find((item) => item.id === productTemplateId);
	const selectedRawMaterialBalance = rawMaterialBalances.find((item) =>
		item.typeId === selectedTemplate?.rawMaterialTypeId
	);
	const selectedPackagingBalance = packagingBalances.find((item) =>
		item.typeId === selectedTemplate?.packagingTypeId
	);
	const stockLine = selectedTemplate
		? formatReleaseStockLine({
			packagingAvailable: selectedPackagingBalance?.quantity ?? 0,
			packagingUnit: selectedTemplate.packagingType.unit,
			rawAvailable: selectedRawMaterialBalance?.quantity ?? 0,
			rawUnit: selectedTemplate.rawMaterialType.unit,
			stockLoading: rawMaterialBalancesLoading || packagingBalancesLoading,
		})
		: "";
	const releaseWarning = selectedTemplate
		? buildReleaseWarning({
			packagingAvailable: selectedPackagingBalance?.quantity ?? 0,
			packagingUnit: selectedTemplate.packagingType.unit,
			productQuantity: parseOptionalPositiveInteger(quantity),
			rawAvailable: selectedRawMaterialBalance?.quantity ?? 0,
			rawQuantity: parseOptionalPositiveNumber(rawQuantity),
			rawUnit: selectedTemplate.rawMaterialType.unit,
			stockLoading: rawMaterialBalancesLoading || packagingBalancesLoading,
		})
		: "";
	const mutation = useMutation({
		mutationFn: () => createProductBatch({
			productTemplateId,
			quantity: parsePositiveInteger(quantity, "Количество продукции"),
			consumedRawMaterialQuantity: parsePositiveNumber(rawQuantity, "Расход сырья"),
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async () => {
			dispatchForm({ type: "reset" });
			await invalidateProduction(queryClient);
			onActionSuccess("Выпуск записан");
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		try {
			parsePositiveInteger(quantity, "Количество продукции");
			parsePositiveNumber(rawQuantity, "Расход сырья");
		} catch (error) {
			dispatchForm({
				type: "patch",
				values: { localError: error instanceof Error ? error.message : "Проверьте количество." },
			});
			return;
		}
		dispatchForm({ type: "patch", values: { localError: "" } });
		mutation.mutate();
	}
	const releaseSubmitDisabled = !online
		|| productTemplates.length === 0
		|| rawMaterialBalancesLoading
		|| packagingBalancesLoading
		|| Boolean(releaseWarning)
		|| mutation.isPending;
	const releaseSubmitBlockReason = !online
		? "Нет сети: операция записи недоступна."
		: productTemplates.length === 0
			? "Нужен активный шаблон продукции с ценой."
			: rawMaterialBalancesLoading || packagingBalancesLoading
				? "Загрузка остатков"
				: releaseWarning || (mutation.isPending ? "Записываем выпуск" : "");

	return (
		<form className="form-panel production-action-form" onSubmit={handleSubmit}>
			<ProductionFormHeading title="Выпуск продукции" />
			<label className="field">
				<span>Шаблон продукции</span>
				<select
					onChange={(event) => dispatchForm({ type: "patch", values: { productTemplateId: event.target.value } })}
					required
					value={productTemplateId}
				>
					<option value="">Выберите шаблон</option>
					{productTemplates.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</label>
			{selectedTemplate ? (
				<ProductionInfoLedger>
					<ProductionInfoRow label="Сырье" value={selectedTemplate.rawMaterialType.name} />
					<ProductionInfoRow label="Тара" value={selectedTemplate.packagingType.name} />
					<ProductionInfoRow label="Доступно" value={stockLine} />
					<ProductionInfoRow label="Цена" value={`${formatPriceRubles(selectedTemplate.priceCents)} ₽`} />
				</ProductionInfoLedger>
			) : null}
			<label className="field">
				<span>Количество продукции, шт</span>
				<input
					inputMode="numeric"
					onChange={(event) => dispatchForm({ type: "patch", values: { quantity: event.target.value } })}
					placeholder="18"
					required
					type="text"
					value={quantity}
				/>
			</label>
			<label className="field">
				<span>Расход сырья, {selectedTemplate?.rawMaterialType.unit ?? "кг"}</span>
				<input
					inputMode="decimal"
					onChange={(event) => dispatchForm({ type: "patch", values: { rawQuantity: event.target.value } })}
					placeholder="12.5"
					required
					type="text"
					value={rawQuantity}
				/>
			</label>
			<label className="field">
				<span>Комментарий</span>
				<input
					onChange={(event) => dispatchForm({ type: "patch", values: { comment: event.target.value } })}
					type="text"
					value={comment}
				/>
			</label>
			{localError ? <p className="form-error">{localError}</p> : null}
			{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
			<ProductionSubmitBlock blockReason={releaseSubmitBlockReason} tone={releaseWarning ? "warning" : "muted"}>
				<button className="primary-button" disabled={releaseSubmitDisabled} type="submit">
					<Factory aria-hidden size={18} />
					Выпустить
				</button>
			</ProductionSubmitBlock>
		</form>
	);
}

function ProductTransferForm({
	distributors,
	loading,
	onActionSuccess,
	online,
	workshopProductBalances,
}: {
	distributors: Distributor[];
	loading: boolean;
	onActionSuccess: (message: string) => void;
	online: boolean;
	workshopProductBalances: WorkshopProductBalanceItem[];
}) {
	const queryClient = useQueryClient();
	const [form, dispatchForm] = useReducer(productTransferFormReducer, EMPTY_PRODUCT_TRANSFER_FORM);
	const { comment, distributorId, localError, productBatchId, quantity } = form;
	const selectedProduct = workshopProductBalances.find((item) => item.productBatchId === productBatchId);
	const selectedDistributor = distributors.find((item) => item.id === distributorId);
	const mutation = useMutation({
		mutationFn: () => createProductTransfer({
			productBatchId,
			distributorId,
			quantity: parsePositiveInteger(quantity, "Количество продукции"),
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async () => {
			dispatchForm({ type: "reset" });
			await invalidateProduction(queryClient);
			onActionSuccess("Передано на распределитель");
		},
	});
	const parsedTransferQuantity = parseOptionalPositiveInteger(quantity);
	const transferWarning = selectedProduct && parsedTransferQuantity !== null && parsedTransferQuantity > selectedProduct.quantity
		? "Количество продукции: нельзя передать больше доступного остатка."
		: "";

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		try {
			const parsedQuantity = parsePositiveInteger(quantity, "Количество продукции");
			if (selectedProduct && parsedQuantity > selectedProduct.quantity) {
				throw new Error("Количество продукции: нельзя передать больше доступного остатка.");
			}
		} catch (error) {
			dispatchForm({
				type: "patch",
				values: { localError: error instanceof Error ? error.message : "Проверьте количество." },
			});
			return;
		}
		dispatchForm({ type: "patch", values: { localError: "" } });
		mutation.mutate();
	}
	const transferSubmitDisabled = !online
		|| loading
		|| distributors.length === 0
		|| workshopProductBalances.length === 0
		|| Boolean(transferWarning)
		|| mutation.isPending;
	const transferSubmitBlockReason = !online
		? "Нет сети: операция записи недоступна."
		: loading
			? "Загрузка продукции"
			: workshopProductBalances.length === 0
				? "В цеху нет готовой продукции для передачи."
				: distributors.length === 0
					? "Нет активного распределителя для передачи."
					: transferWarning || (mutation.isPending ? "Передаем продукцию" : "");

	return (
		<form className="form-panel production-action-form" onSubmit={handleSubmit}>
			<ProductionFormHeading title="Передать" meta={selectedDistributor?.name} />
			<label className="field">
				<span>Продукция</span>
				<select
					onChange={(event) => dispatchForm({ type: "patch", values: { productBatchId: event.target.value } })}
					required
					value={productBatchId}
				>
					<option value="">Выберите продукцию</option>
					{workshopProductBalances.map((item) => (
						<option key={item.id} value={item.productBatchId}>
							{item.productName} · {item.quantity} шт
						</option>
					))}
				</select>
			</label>
			{selectedProduct ? (
				<ProductionInfoLedger>
					<ProductionInfoRow label="Доступно" value={`${selectedProduct.quantity} шт`} />
					<ProductionInfoRow label="Цена" value={`${formatPriceRubles(selectedProduct.priceCents)} ₽`} />
					<ProductionInfoRow label="Выпуск" value={formatDateTime(selectedProduct.createdAt)} />
				</ProductionInfoLedger>
			) : null}
			<label className="field">
				<span>Распределитель</span>
				<select
					onChange={(event) => dispatchForm({ type: "patch", values: { distributorId: event.target.value } })}
					required
					value={distributorId}
				>
					<option value="">Выберите распределитель</option>
					{distributors.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</label>
			<label className="field">
				<span>Количество, шт</span>
				<input
					inputMode="numeric"
					onChange={(event) => dispatchForm({ type: "patch", values: { quantity: event.target.value } })}
					placeholder="4"
					required
					type="text"
					value={quantity}
				/>
			</label>
			<label className="field">
				<span>Комментарий</span>
				<input
					onChange={(event) => dispatchForm({ type: "patch", values: { comment: event.target.value } })}
					type="text"
					value={comment}
				/>
			</label>
			{localError ? <p className="form-error">{localError}</p> : null}
			{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
			<ProductionSubmitBlock blockReason={transferSubmitBlockReason} tone={transferWarning ? "warning" : "muted"}>
				<button className="primary-button" disabled={transferSubmitDisabled} type="submit">
					<ArrowRightLeft aria-hidden size={18} />
					Передать
				</button>
			</ProductionSubmitBlock>
		</form>
	);
}

function ProductionFormHeading({ meta, title }: { meta?: string | undefined; title: string }) {
	return (
		<div className="production-form-heading">
			<h2>{title}</h2>
			{meta ? <span>{meta}</span> : null}
		</div>
	);
}

function ProductionInfoLedger({ children }: { children: ReactNode }) {
	return <div className="production-form-ledger">{children}</div>;
}

function ProductionInfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="production-form-ledger-row">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function ProductionSubmitBlock({
	blockReason,
	children,
	tone = "muted",
}: {
	blockReason: string;
	children: ReactNode;
	tone?: "muted" | "warning";
}) {
	return (
		<div className="production-submit-block">
			{blockReason ? <p className={`production-submit-reason ${tone}`}>{blockReason}</p> : null}
			{children}
		</div>
	);
}

function ProductionHistory({
	loading,
	productBatches,
}: {
	loading: boolean;
	productBatches: ProductBatch[];
}) {
	return (
		<section className="screen-stack operation-history-home">
			<div className="operation-history-topbar">
				<div className="section-heading compact">
					<h2>История</h2>
					{loading ? <span>Обновление</span> : null}
				</div>
			</div>
			<div className="operation-history-body">
				{loading ? <p className="muted">Загрузка истории</p> : null}
				{!loading && productBatches.length === 0 ? <p className="muted">Выпусков пока нет.</p> : null}
				<ProductBatchList productBatches={productBatches} />
			</div>
		</section>
	);
}

function StockListScreen({
	emptyText,
	items,
	loading,
	title,
}: {
	emptyText: string;
	items: Array<{ id: string; name: string; quantity: number; unit: string }>;
	loading: boolean;
	title: string;
}) {
	return (
		<section className="production-detail-list">
			<table className="production-ledger-list" aria-label={`${title}: список`}>
				<caption className="inventory-table-title">
					<h2>{title}</h2>
				</caption>
				<thead>
					<tr className="production-ledger-head">
						<th scope="col">Наименование</th>
						<th scope="col">Остаток</th>
					</tr>
				</thead>
				<tbody>
					{loading ? <ProductionListMessage colSpan={2} text="Загрузка списка" /> : null}
					{!loading && items.length === 0 ? <ProductionListMessage colSpan={2} text={emptyText} /> : null}
					{items.map((item) => (
						<BalanceRow item={item} key={item.id} />
					))}
				</tbody>
			</table>
		</section>
	);
}

function ProductStockScreen({
	loading,
	workshopProductBalances,
}: {
	loading: boolean;
	workshopProductBalances: WorkshopProductBalanceItem[];
}) {
	return (
		<section className="production-detail-list">
			<WorkshopProductBalanceList loading={loading} workshopProductBalances={workshopProductBalances} />
		</section>
	);
}

function WorkshopProductBalanceList({
	loading,
	workshopProductBalances,
}: {
	loading: boolean;
	workshopProductBalances: WorkshopProductBalanceItem[];
}) {
	return (
		<table className="inventory-table-list" aria-label="Продукция в цеху">
			<caption className="inventory-table-title">
				<h2>Продукция в цеху</h2>
			</caption>
			<thead>
				<tr className="inventory-table-head">
					<th scope="col">Наименование</th>
					<th scope="col">Количество</th>
					<th scope="col">Цена</th>
				</tr>
			</thead>
			<tbody>
				{loading ? <ProductionListMessage colSpan={3} text="Загрузка продукции" /> : null}
				{!loading && workshopProductBalances.length === 0 ? (
					<ProductionListMessage colSpan={3} text="Готовой продукции пока нет. Выпустите первую партию." />
				) : null}
				{workshopProductBalances.map((balance) => (
					<tr className="inventory-table-row" key={balance.id}>
						<td className="inventory-table-product">
							<strong>{balance.productName}</strong>
							<span>{formatDateTime(balance.createdAt)}</span>
						</td>
						<td className="inventory-table-quantity">
							<strong>{balance.quantity} шт</strong>
							<span>из {balance.producedQuantity} шт</span>
						</td>
						<td className="inventory-table-total">
							<strong>{formatPriceRubles(balance.priceCents)} ₽</strong>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function ProductBatchList({ productBatches }: { productBatches: ProductBatch[] }) {
	return (
		<ul className="operation-history-list production-history-list" aria-label="Последние выпуски">
			{productBatches.map((batch) => (
				<li className="operation-history-row production-history-row" key={batch.id}>
					<div className="operation-history-row-main">
						<strong>{batch.productName}</strong>
						<p>
							{formatDateTime(batch.createdAt)}
							{" · "}
							{batch.rawMaterialTypeName}: {formatQuantity(batch.consumedRawMaterialQuantity)} {batch.rawMaterialUnit}
							{" · "}
							{batch.packagingTypeName}: {formatQuantity(batch.consumedPackagingQuantity)} {batch.packagingUnit}
						</p>
					</div>
					<div className="operation-history-row-side">
						<strong>{batch.quantity} шт</strong>
						<span>{formatPriceRubles(batch.priceCents)}&nbsp;₽/шт</span>
					</div>
				</li>
			))}
		</ul>
	);
}

function ProductionListMessage({ colSpan, text }: { colSpan: number; text: string }) {
	return (
		<tr className="production-list-message">
			<td colSpan={colSpan}>{text}</td>
		</tr>
	);
}

function BalanceRow({
	item,
}: {
	item: { name: string; quantity: number; unit: string };
}) {
	return (
		<tr className="production-ledger-row">
			<td>
				<strong>{item.name}</strong>
			</td>
			<td className="production-ledger-quantity">
				{formatQuantity(item.quantity)} {item.unit}
			</td>
		</tr>
	);
}

function buildStockItems(
	types: Array<RawMaterialType | PackagingType>,
	balances: ProductionBalanceItem[],
): Array<{ id: string; name: string; quantity: number; unit: string }> {
	const balanceByTypeId = new Map(balances.map((balance) => [balance.typeId, balance]));
	const stockItems: Array<{ id: string; name: string; quantity: number; unit: string }> = [];

	for (const type of types) {
		const balance = balanceByTypeId.get(type.id);
		const quantity = balance?.quantity ?? 0;
		if (quantity <= 0) {
			continue;
		}

		stockItems.push({
			id: type.id,
			name: type.name,
			quantity,
			unit: type.unit,
		});
	}

	return stockItems;
}

function formatReleaseStockLine({
	packagingAvailable,
	packagingUnit,
	rawAvailable,
	rawUnit,
	stockLoading,
}: {
	packagingAvailable: number;
	packagingUnit: string;
	rawAvailable: number;
	rawUnit: string;
	stockLoading: boolean;
}): string {
	if (stockLoading) {
		return "Загрузка остатков";
	}

	return `${formatQuantity(rawAvailable)} ${rawUnit} сырья, ${formatQuantity(packagingAvailable)} ${packagingUnit} тары`;
}

function ProductionSuccessNotice({ notice }: { notice: SuccessNotice }) {
	return (
		<output className="production-success-notice" aria-live="polite" key={notice.id}>
			<Check aria-hidden size={18} />
			<span>{notice.message}</span>
		</output>
	);
}

function parsePositiveNumber(value: string, label: string): number {
	const normalized = value.trim().replace(",", ".");
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${label}: введите положительное число.`);
	}

	return parsed;
}

function parsePositiveInteger(value: string, label: string): number {
	const parsed = parsePositiveNumber(value, label);
	if (!Number.isInteger(parsed)) {
		throw new Error(`${label}: нужно целое число.`);
	}

	return parsed;
}

function parseOptionalPositiveNumber(value: string): number | null {
	const normalized = value.trim().replace(",", ".");
	if (!normalized) {
		return null;
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalPositiveInteger(value: string): number | null {
	const parsed = parseOptionalPositiveNumber(value);
	return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function buildReleaseWarning({
	packagingAvailable,
	packagingUnit,
	productQuantity,
	rawAvailable,
	rawQuantity,
	rawUnit,
	stockLoading,
}: {
	packagingAvailable: number;
	packagingUnit: string;
	productQuantity: number | null;
	rawAvailable: number;
	rawQuantity: number | null;
	rawUnit: string;
	stockLoading: boolean;
}): string {
	if (stockLoading) {
		return "";
	}

	if (packagingAvailable <= 0) {
		return "Для этого шаблона нет тары в цеху.";
	}

	if (rawAvailable <= 0) {
		return "Для этого шаблона нет сырья в цеху.";
	}

	if (productQuantity !== null && productQuantity > packagingAvailable) {
		return `Не хватает тары: нужно ${formatQuantity(productQuantity)} ${packagingUnit}, доступно ${formatQuantity(packagingAvailable)} ${packagingUnit}.`;
	}

	if (rawQuantity !== null && rawQuantity > rawAvailable) {
		return `Не хватает сырья: нужно ${formatQuantity(rawQuantity)} ${rawUnit}, доступно ${formatQuantity(rawAvailable)} ${rawUnit}.`;
	}

	return "";
}

function formatQuantity(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPriceRubles(priceCents: number): string {
	return formatCompactMoneyCents(priceCents);
}

function formatDateTime(value: string): string {
	return PRODUCTION_DATE_TIME_FORMATTER.format(new Date(value));
}

async function invalidateProduction(queryClient: ReturnType<typeof useQueryClient>) {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: ["production"] }),
	]);
}
