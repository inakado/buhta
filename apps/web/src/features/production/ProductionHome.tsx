"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
	ArrowRightLeft,
	ArrowLeft,
	Bell,
	Check,
	ChevronRight,
	CirclePlus,
	Factory,
	FishSymbol,
	Package,
	PackageCheck,
	PackagePlus,
	type LucideIcon,
} from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
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

type ProductionTab = "home" | "notifications" | "history";
type ProductionScreen = "raw-intake" | "packaging-intake" | "batch-release" | "transfer" | "raw-stock" | "packaging-stock" | "products";

export function ProductionHome({
	activeTab,
	online,
}: {
	activeTab: ProductionTab;
	online: boolean;
}) {
	const [activeScreen, setActiveScreen] = useState<ProductionScreen | null>(null);
	const summary = useQuery({
		queryKey: ["production", "summary"],
		queryFn: getProductionSummary,
	});
	const rawMaterialBalances = useQuery({
		queryKey: ["production", "raw-material-balances"],
		queryFn: listRawMaterialBalances,
	});
	const packagingBalances = useQuery({
		queryKey: ["production", "packaging-balances"],
		queryFn: listPackagingBalances,
	});
	const productBatches = useQuery({
		queryKey: ["production", "product-batches"],
		queryFn: listProductBatches,
	});
	const workshopProductBalances = useQuery({
		queryKey: ["production", "workshop-product-balances"],
		queryFn: listWorkshopProductBalances,
	});
	const transferOptions = useQuery({
		queryKey: ["production", "transfer-options"],
		queryFn: getProductionTransferOptions,
	});
	const options = useQuery({
		queryKey: ["production", "options"],
		queryFn: getProductionOptions,
	});

	useEffect(() => {
		if (activeTab !== "home") {
			setActiveScreen(null);
		}
	}, [activeTab]);

	if (activeTab === "home" && activeScreen) {
		return (
			<ProductionDetailScreen
				mode={activeScreen}
				onBack={() => setActiveScreen(null)}
				online={online}
				packagingBalances={packagingBalances.data?.packagingBalances ?? []}
				packagingBalancesLoading={packagingBalances.isLoading}
				packagingTypes={options.data?.packagingTypes ?? []}
				productTemplates={options.data?.productTemplates ?? []}
				rawMaterialBalances={rawMaterialBalances.data?.rawMaterialBalances ?? []}
				rawMaterialBalancesLoading={rawMaterialBalances.isLoading}
				rawMaterialTypes={options.data?.rawMaterialTypes ?? []}
				transferDistributors={transferOptions.data?.distributors ?? []}
				transferOptionsLoading={transferOptions.isLoading}
				transferWorkshopProductBalances={transferOptions.data?.workshopProductBalances ?? []}
				workshopProductBalances={workshopProductBalances.data?.workshopProductBalances ?? []}
				workshopProductBalancesLoading={workshopProductBalances.isLoading}
			/>
		);
	}

	if (activeTab === "notifications") {
		return (
			<ProductionPlaceholder
				icon={Bell}
				title="Уведомления"
				text="Здесь будут входящие уведомления от коммерческого директора."
			/>
		);
	}

	if (activeTab === "history") {
		return (
			<ProductionHistory
				loading={productBatches.isLoading}
				productBatches={productBatches.data?.productBatches ?? []}
			/>
		);
	}

	const summaryValue = summary.data?.summary;

	return (
		<section className="screen-stack">
			<button className="summary-card production-summary-button" onClick={() => setActiveScreen("products")} type="button">
				<div>
					<p className="summary-label">Продукция в цеху</p>
					<strong>{summaryValue?.readyProductUnits ?? 0}</strong>
					<p className="summary-note">единиц готово к дальнейшему перемещению</p>
				</div>
				<PackageCheck aria-hidden size={30} />
			</button>

			<div className="production-stock-stack">
				<StockAggregateCard
					icon={FishSymbol}
					kinds={summaryValue?.rawMaterialKinds ?? 0}
					label="Сырье"
					loading={summary.isLoading}
					onClick={() => setActiveScreen("raw-stock")}
					total={summaryValue?.rawMaterialTotal ?? 0}
					unit={summaryValue?.rawMaterialUnit ?? "кг"}
				/>
				<StockAggregateCard
					icon={Package}
					kinds={summaryValue?.packagingKinds ?? 0}
					label="Тара"
					loading={summary.isLoading}
					onClick={() => setActiveScreen("packaging-stock")}
					total={summaryValue?.packagingTotal ?? 0}
					unit={summaryValue?.packagingUnit ?? "шт"}
				/>
			</div>

			<div className="action-grid">
				<button className="action-tile primary-action" onClick={() => setActiveScreen("batch-release")} type="button">
					<Factory aria-hidden size={22} />
					<span>Выпустить</span>
				</button>
				<button className="action-tile" disabled={!online} onClick={() => setActiveScreen("transfer")} type="button">
					<ArrowRightLeft aria-hidden size={22} />
					<span>На распределитель</span>
				</button>
				<button className="action-tile" onClick={() => setActiveScreen("raw-intake")} type="button">
					<CirclePlus aria-hidden size={22} />
					<span>Добавить сырье</span>
				</button>
				<button className="action-tile" onClick={() => setActiveScreen("packaging-intake")} type="button">
					<PackagePlus aria-hidden size={22} />
					<span>Добавить тару</span>
				</button>
			</div>
		</section>
	);
}

function ProductionDetailScreen({
	mode,
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
		<section className="screen-stack">
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
					online={online}
					title="Приход сырья"
				/>
			) : null}
			{mode === "packaging-intake" ? (
				<IntakeForm
					emptyText="Сначала директор или администратор должен добавить активный вид тары."
					items={activePackagingTypes}
					kind="packaging"
					online={online}
					title="Приход тары"
				/>
			) : null}
			{mode === "batch-release" ? (
				<ProductBatchForm
					online={online}
					productTemplates={activeProductTemplates}
				/>
			) : null}
			{mode === "transfer" ? (
				<ProductTransferForm
					distributors={transferDistributors}
					loading={transferOptionsLoading}
					online={online}
					workshopProductBalances={transferWorkshopProductBalances}
				/>
			) : null}
			{mode === "raw-stock" ? (
				<StockListScreen
					emptyText="Сырья пока нет. Добавьте первый приход сырья."
					icon={FishSymbol}
					items={rawStockItems}
					loading={rawMaterialBalancesLoading}
					title="Сырье"
				/>
			) : null}
			{mode === "packaging-stock" ? (
				<StockListScreen
					emptyText="Тары пока нет. Добавьте первый приход тары."
					icon={Package}
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
	online,
	title,
}: {
	emptyText: string;
	items: Array<RawMaterialType | PackagingType>;
	kind: "raw" | "packaging";
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
		},
	});
	const selectedItem = items.find((item) => item.id === typeId);

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
		<form className="form-panel" onSubmit={handleSubmit}>
			<div className="section-heading compact">
				<h2>{title}</h2>
				<span>{selectedItem?.unit ?? ""}</span>
			</div>
			{items.length === 0 ? <p className="muted">{emptyText}</p> : null}
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
			<button className="primary-button" disabled={!online || items.length === 0 || mutation.isPending} type="submit">
				<Check aria-hidden size={18} />
				Записать приход
			</button>
		</form>
	);
}

function ProductBatchForm({
	online,
	productTemplates,
}: {
	online: boolean;
	productTemplates: ProductTemplate[];
}) {
	const queryClient = useQueryClient();
	const [productTemplateId, setProductTemplateId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [rawQuantity, setRawQuantity] = useState("");
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
	const selectedTemplate = productTemplates.find((item) => item.id === productTemplateId);
	const mutation = useMutation({
		mutationFn: () => createProductBatch({
			productTemplateId,
			quantity: parsePositiveInteger(quantity, "Количество продукции"),
			consumedRawMaterialQuantity: parsePositiveNumber(rawQuantity, "Расход сырья"),
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async () => {
			setProductTemplateId("");
			setQuantity("");
			setRawQuantity("");
			setComment("");
			setLocalError("");
			await invalidateProduction(queryClient);
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		try {
			parsePositiveInteger(quantity, "Количество продукции");
			parsePositiveNumber(rawQuantity, "Расход сырья");
		} catch (error) {
			setLocalError(error instanceof Error ? error.message : "Проверьте количество.");
			return;
		}
		setLocalError("");
		mutation.mutate();
	}

	return (
		<form className="form-panel" onSubmit={handleSubmit}>
			<div className="section-heading compact">
				<h2>Выпуск продукции</h2>
				<span>{selectedTemplate ? `${formatPriceRubles(selectedTemplate.priceCents)} ₽` : ""}</span>
			</div>
			{productTemplates.length === 0 ? (
				<p className="muted">Нужен активный шаблон продукции с ценой.</p>
			) : null}
			<label className="field">
				<span>Шаблон продукции</span>
				<select onChange={(event) => setProductTemplateId(event.target.value)} required value={productTemplateId}>
					<option value="">Выберите шаблон</option>
					{productTemplates.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</label>
			{selectedTemplate ? (
				<p className="muted">
					{selectedTemplate.rawMaterialType.name} / {selectedTemplate.packagingType.name}
				</p>
			) : null}
			<label className="field">
				<span>Количество продукции, шт</span>
				<input
					inputMode="numeric"
					onChange={(event) => setQuantity(event.target.value)}
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
					onChange={(event) => setRawQuantity(event.target.value)}
					placeholder="12.5"
					required
					type="text"
					value={rawQuantity}
				/>
			</label>
			<label className="field">
				<span>Комментарий</span>
				<input onChange={(event) => setComment(event.target.value)} type="text" value={comment} />
			</label>
			{localError ? <p className="form-error">{localError}</p> : null}
			{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
			<button
				className="primary-button"
				disabled={!online || productTemplates.length === 0 || mutation.isPending}
				type="submit"
			>
				<Factory aria-hidden size={18} />
				Выпустить
			</button>
		</form>
	);
}

function ProductTransferForm({
	distributors,
	loading,
	online,
	workshopProductBalances,
}: {
	distributors: Distributor[];
	loading: boolean;
	online: boolean;
	workshopProductBalances: WorkshopProductBalanceItem[];
}) {
	const queryClient = useQueryClient();
	const [productBatchId, setProductBatchId] = useState("");
	const [distributorId, setDistributorId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
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
			setProductBatchId("");
			setDistributorId("");
			setQuantity("");
			setComment("");
			setLocalError("");
			await invalidateProduction(queryClient);
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		try {
			const parsedQuantity = parsePositiveInteger(quantity, "Количество продукции");
			if (selectedProduct && parsedQuantity > selectedProduct.quantity) {
				throw new Error("Количество продукции: нельзя переместить больше доступного остатка.");
			}
		} catch (error) {
			setLocalError(error instanceof Error ? error.message : "Проверьте количество.");
			return;
		}
		setLocalError("");
		mutation.mutate();
	}

	return (
		<form className="form-panel" onSubmit={handleSubmit}>
			<div className="section-heading compact">
				<h2>На распределитель</h2>
				<span>{selectedDistributor?.name ?? ""}</span>
			</div>
			{loading ? <p className="muted">Загрузка доступной продукции</p> : null}
			{!loading && workshopProductBalances.length === 0 ? (
				<p className="muted">В цеху нет готовой продукции для перемещения.</p>
			) : null}
			{!loading && distributors.length === 0 ? (
				<p className="muted">Нет активного распределителя для перемещения.</p>
			) : null}
			<label className="field">
				<span>Продукция</span>
				<select onChange={(event) => setProductBatchId(event.target.value)} required value={productBatchId}>
					<option value="">Выберите продукцию</option>
					{workshopProductBalances.map((item) => (
						<option key={item.id} value={item.productBatchId}>
							{item.productName} · {item.quantity} шт
						</option>
					))}
				</select>
			</label>
			{selectedProduct ? (
				<p className="muted">
					Доступно {selectedProduct.quantity} шт · {formatPriceRubles(selectedProduct.priceCents)} ₽ · выпуск{" "}
					{formatDateTime(selectedProduct.createdAt)}
				</p>
			) : null}
			<label className="field">
				<span>Распределитель</span>
				<select onChange={(event) => setDistributorId(event.target.value)} required value={distributorId}>
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
					onChange={(event) => setQuantity(event.target.value)}
					placeholder="4"
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
			<button
				className="primary-button"
				disabled={!online || loading || distributors.length === 0 || workshopProductBalances.length === 0 || mutation.isPending}
				type="submit"
			>
				<ArrowRightLeft aria-hidden size={18} />
				Переместить
			</button>
		</form>
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
		<section className="screen-stack">
			<div className="section-heading">
				<h2>История</h2>
				<span>Последние выпуски</span>
			</div>
			{loading ? <p className="muted">Загрузка истории</p> : null}
			{!loading && productBatches.length === 0 ? <p className="muted">Выпусков пока нет</p> : null}
			<ProductBatchList productBatches={productBatches} />
		</section>
	);
}

function StockListScreen({
	emptyText,
	icon,
	items,
	loading,
	title,
}: {
	emptyText: string;
	icon: LucideIcon;
	items: Array<{ id: string; name: string; quantity: number; unit: string }>;
	loading: boolean;
	title: string;
}) {
	return (
		<section className="detail-list-panel">
			<div className="section-heading compact">
				<h2>{title}</h2>
				<span>Остатки</span>
			</div>
			{loading ? <p className="muted">Загрузка остатков</p> : null}
			{!loading && items.length === 0 ? <p className="muted">{emptyText}</p> : null}
			<div className="production-balance-list">
				{items.map((item) => (
					<BalanceRow icon={icon} item={item} key={item.id} />
				))}
			</div>
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
		<section className="detail-list-panel">
			<div className="section-heading compact">
				<h2>Продукция в цеху</h2>
				<span>Доступный остаток</span>
			</div>
			{loading ? <p className="muted">Загрузка продукции</p> : null}
			{!loading && workshopProductBalances.length === 0 ? (
				<p className="muted">Готовой продукции пока нет. Выпустите первую партию.</p>
			) : null}
			<WorkshopProductBalanceList workshopProductBalances={workshopProductBalances} />
		</section>
	);
}

function WorkshopProductBalanceList({
	workshopProductBalances,
}: {
	workshopProductBalances: WorkshopProductBalanceItem[];
}) {
	return (
		<div className="list-stack">
			{workshopProductBalances.map((balance) => (
				<article className="entity-card production-history-card" key={balance.id}>
					<div>
						<strong>{balance.productName}</strong>
						<p>
							Доступно {balance.quantity} из {balance.producedQuantity} шт
						</p>
					</div>
					<div className="production-history-meta">
						<strong>{formatPriceRubles(balance.priceCents)} ₽</strong>
						<span>{formatDateTime(balance.createdAt)}</span>
					</div>
				</article>
			))}
		</div>
	);
}

function ProductBatchList({ productBatches }: { productBatches: ProductBatch[] }) {
	return (
		<div className="list-stack">
			{productBatches.map((batch) => (
				<article className="entity-card production-history-card" key={batch.id}>
					<div>
						<strong>{batch.productName}</strong>
						<p>
							{batch.quantity} шт · сырье {batch.consumedRawMaterialQuantity} {batch.rawMaterialUnit}
						</p>
					</div>
					<div className="production-history-meta">
						<strong>{formatPriceRubles(batch.priceCents)} ₽</strong>
						<span>{formatDateTime(batch.createdAt)}</span>
					</div>
				</article>
			))}
		</div>
	);
}

function BalanceRow({
	icon: Icon,
	item,
}: {
	icon: LucideIcon;
	item: { name: string; quantity: number; unit: string };
}) {
	return (
		<div className="production-balance-row">
			<div className="production-row-icon">
				<Icon aria-hidden size={18} />
			</div>
			<div>
				<strong>{item.name}</strong>
				<p>Остаток</p>
			</div>
			<span>
				{formatQuantity(item.quantity)} {item.unit}
			</span>
		</div>
	);
}

function buildStockItems(
	types: Array<RawMaterialType | PackagingType>,
	balances: ProductionBalanceItem[],
): Array<{ id: string; name: string; quantity: number; unit: string }> {
	const balanceByTypeId = new Map(balances.map((balance) => [balance.typeId, balance]));

	return types
		.map((type) => {
			const balance = balanceByTypeId.get(type.id);

			return {
				id: type.id,
				name: type.name,
				quantity: balance?.quantity ?? 0,
				unit: type.unit,
			};
		})
		.filter((item) => item.quantity > 0);
}

function StockAggregateCard({
	icon: Icon,
	kinds,
	label,
	loading,
	onClick,
	total,
	unit,
}: {
	icon: LucideIcon;
	kinds: number;
	label: string;
	loading: boolean;
	onClick: () => void;
	total: number;
	unit: string;
}) {
	return (
		<button className="stock-aggregate-card" disabled={loading} onClick={onClick} type="button">
			<div className="production-row-icon">
				<Icon aria-hidden size={18} />
			</div>
			<div className="stock-aggregate-body">
				<strong>{label}</strong>
				<p>{loading ? "Загрузка" : `${kinds} видов`}</p>
			</div>
			<div className="stock-aggregate-value">
				<strong>
					{formatQuantity(total)} {unit}
				</strong>
			</div>
			<ChevronRight aria-hidden size={16} />
		</button>
	);
}

function ProductionPlaceholder({
	icon: Icon,
	text,
	title,
}: {
	icon: typeof PackageCheck;
	text: string;
	title: string;
}) {
	return (
		<section className="screen-stack">
			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">{title}</p>
					<strong>{text}</strong>
				</div>
				<Icon aria-hidden size={28} />
			</div>
		</section>
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

function formatQuantity(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPriceRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}

function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		month: "2-digit",
	}).format(new Date(value));
}

async function invalidateProduction(queryClient: ReturnType<typeof useQueryClient>) {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: ["production"] }),
	]);
}
