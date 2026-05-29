"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Archive, Check, ClipboardList, Edit3, Package, Plus, Scale, Truck } from "lucide-react";
import type {
	Distributor,
	PackagingType,
	ProductTemplate,
	RawMaterialType,
	UpdateProductTemplateRequest,
} from "@buhta/shared";
import { formatMoneyCents, moneyCents, rublePriceToCents } from "@buhta/shared";
import {
	archiveDistributor,
	archivePackagingType,
	archiveProductTemplate,
	archiveRawMaterialType,
	createDistributor,
	createPackagingType,
	createProductTemplate,
	createRawMaterialType,
	listDistributors,
	listPackagingTypes,
	listProductTemplates,
	listRawMaterialTypes,
	updateDistributor,
	updatePackagingType,
	updateProductTemplate,
	updateRawMaterialType,
} from "../../lib/api-client";

type CatalogTab = "raw" | "packaging" | "distributors" | "products";
type SimpleCatalogItem = RawMaterialType | PackagingType | Distributor;
type SimpleCatalogInput = {
	name: string;
	unit?: string;
};
type SimpleCatalogUpdate = {
	name?: string;
	unit?: string;
	active?: boolean;
};

const tabs: Array<{ id: CatalogTab; label: string; icon: typeof ClipboardList }> = [
	{ id: "raw", label: "Сырье", icon: Scale },
	{ id: "packaging", label: "Тара", icon: Package },
	{ id: "distributors", label: "Распределители", icon: Truck },
	{ id: "products", label: "Шаблоны", icon: ClipboardList },
];

export function CatalogHome({ online }: { online: boolean }) {
	const [activeTab, setActiveTab] = useState<CatalogTab>("raw");
	const rawMaterialTypes = useQuery({
		queryKey: ["catalog", "raw-material-types"],
		queryFn: listRawMaterialTypes,
	});
	const packagingTypes = useQuery({
		queryKey: ["catalog", "packaging-types"],
		queryFn: listPackagingTypes,
	});
	const distributors = useQuery({
		queryKey: ["catalog", "distributors"],
		queryFn: listDistributors,
	});
	const productTemplates = useQuery({
		queryKey: ["catalog", "product-templates"],
		queryFn: listProductTemplates,
	});

	return (
		<section className="screen-stack">
			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">Справочники</p>
					<strong>Сырье, тара, распределители и шаблоны</strong>
				</div>
				<ClipboardList aria-hidden size={28} />
			</div>

			<div className="catalog-tabs" aria-label="Разделы справочников">
				{tabs.map((tab) => (
					<button
						aria-current={activeTab === tab.id ? "page" : undefined}
						className={activeTab === tab.id ? "active" : ""}
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						type="button"
					>
						<tab.icon aria-hidden size={16} />
						<span>{tab.label}</span>
					</button>
				))}
			</div>

			{activeTab === "raw" ? (
				<SimpleCatalogSection
					createItem={(input) => createRawMaterialType({ name: input.name, unit: input.unit ?? "" })}
					items={rawMaterialTypes.data?.rawMaterialTypes ?? []}
					loading={rawMaterialTypes.isLoading}
					online={online}
					queryKey={["catalog", "raw-material-types"]}
					title="Виды сырья"
					unitLabel="Единица измерения"
					archiveItem={archiveRawMaterialType}
					updateItem={updateRawMaterialType}
				/>
			) : null}

			{activeTab === "packaging" ? (
				<SimpleCatalogSection
					createItem={(input) => createPackagingType({ name: input.name, unit: input.unit ?? "" })}
					items={packagingTypes.data?.packagingTypes ?? []}
					loading={packagingTypes.isLoading}
					online={online}
					queryKey={["catalog", "packaging-types"]}
					title="Виды тары"
					unitLabel="Единица учета"
					archiveItem={archivePackagingType}
					updateItem={updatePackagingType}
				/>
			) : null}

			{activeTab === "distributors" ? (
				<SimpleCatalogSection
					createItem={createDistributor}
					items={distributors.data?.distributors ?? []}
					loading={distributors.isLoading}
					online={online}
					queryKey={["catalog", "distributors"]}
					title="Распределители"
					archiveItem={archiveDistributor}
					updateItem={updateDistributor}
				/>
			) : null}

			{activeTab === "products" ? (
				<ProductTemplatesSection
					items={productTemplates.data?.productTemplates ?? []}
					loading={productTemplates.isLoading}
					online={online}
					packagingTypes={packagingTypes.data?.packagingTypes ?? []}
					rawMaterialTypes={rawMaterialTypes.data?.rawMaterialTypes ?? []}
					archiveItem={archiveProductTemplate}
				/>
			) : null}
		</section>
	);
}

function SimpleCatalogSection({
	archiveItem,
	createItem,
	items,
	loading,
	online,
	queryKey,
	title,
	unitLabel,
	updateItem,
}: {
	archiveItem: (id: string) => Promise<unknown>;
	createItem: (input: SimpleCatalogInput) => Promise<unknown>;
	items: SimpleCatalogItem[];
	loading: boolean;
	online: boolean;
	queryKey: readonly unknown[];
	title: string;
	unitLabel?: string;
	updateItem: (id: string, input: SimpleCatalogUpdate) => Promise<unknown>;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [unit, setUnit] = useState("");
	const [showArchived, setShowArchived] = useState(false);
	const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
	const archivedItems = useMemo(() => items.filter((item) => !item.active), [items]);
	const visibleItems = showArchived ? archivedItems : activeItems;
	const createMutation = useMutation({
		mutationFn: createItem,
		onSuccess: async () => {
			setName("");
			setUnit("");
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const updateMutation = useMutation({
		mutationFn: ({ id, input }: { id: string; input: SimpleCatalogUpdate }) => updateItem(id, input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const archiveMutation = useMutation({
		mutationFn: archiveItem,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	function handleCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		createMutation.mutate({
			name,
			...(unitLabel ? { unit } : {}),
		});
	}

	return (
		<div className="catalog-section">
			<form className="form-panel" onSubmit={handleCreate}>
				<div className="section-heading compact">
					<h2>{title}</h2>
				</div>
				<label className="field">
					<span>Название</span>
					<input onChange={(event) => setName(event.target.value)} required type="text" value={name} />
				</label>
				{unitLabel ? (
					<label className="field">
						<span>{unitLabel}</span>
						<input onChange={(event) => setUnit(event.target.value)} required type="text" value={unit} />
					</label>
				) : null}
				{createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
				<button className="primary-button" disabled={!online || createMutation.isPending} type="submit">
					<Plus aria-hidden size={18} />
					Добавить
				</button>
			</form>

			<CatalogArchiveHeader
				archivedCount={archivedItems.length}
				showArchived={showArchived}
				onToggle={() => setShowArchived((current) => !current)}
			/>

			<CatalogListState
				count={visibleItems.length}
				emptyLabel={showArchived ? "В архиве пока пусто" : "Активных записей пока нет"}
				loading={loading}
			/>

			<div className="list-stack">
				{visibleItems.map((item) => (
					<SimpleCatalogListItem
						item={item}
						key={item.id}
						online={online}
						pending={updateMutation.isPending || archiveMutation.isPending}
						{...(unitLabel ? { unitLabel } : {})}
						archiveItem={() => archiveMutation.mutate(item.id)}
						restoreItem={() => updateMutation.mutate({ id: item.id, input: { active: true } })}
						updateItem={(input) => updateMutation.mutate({ id: item.id, input })}
					/>
				))}
				{updateMutation.isError ? <p className="form-error">{updateMutation.error.message}</p> : null}
				{archiveMutation.isError ? <p className="form-error">{archiveMutation.error.message}</p> : null}
			</div>
		</div>
	);
}

function SimpleCatalogListItem({
	item,
	online,
	pending,
	unitLabel,
	archiveItem,
	restoreItem,
	updateItem,
}: {
	item: SimpleCatalogItem;
	online: boolean;
	pending: boolean;
	unitLabel?: string;
	archiveItem: () => void;
	restoreItem: () => void;
	updateItem: (input: SimpleCatalogUpdate) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(item.name);
	const unitValue = "unit" in item ? item.unit : "";
	const [unit, setUnit] = useState(unitValue);

	function handleSave() {
		updateItem({
			name,
			...(unitLabel ? { unit } : {}),
		});
		setEditing(false);
	}

	if (editing) {
		return (
			<article className="entity-card edit-card">
				<label className="field">
					<span>Название</span>
					<input onChange={(event) => setName(event.target.value)} type="text" value={name} />
				</label>
				{unitLabel ? (
					<label className="field">
						<span>{unitLabel}</span>
						<input onChange={(event) => setUnit(event.target.value)} type="text" value={unit} />
					</label>
				) : null}
				<div className="entity-actions">
					<button className="secondary-button" onClick={() => setEditing(false)} type="button">
						Отмена
					</button>
					<button className="secondary-button" disabled={!online || pending} onClick={handleSave} type="button">
						<Check aria-hidden size={16} />
						Сохранить
					</button>
				</div>
			</article>
		);
	}

	return (
		<article className="entity-card">
			<div>
				<strong>{item.name}</strong>
				{unitLabel ? <p>{unitValue}</p> : null}
			</div>
			<div className="entity-actions">
				<ArchiveButton
					active={item.active}
					disabled={!online || pending}
					onArchive={archiveItem}
					onRestore={restoreItem}
				/>
				<button
					aria-label={`Редактировать ${item.name}`}
					className="secondary-icon-button"
					disabled={!online || pending || !item.active}
					onClick={() => setEditing(true)}
					title="Редактировать"
					type="button"
				>
					<Edit3 aria-hidden size={16} />
				</button>
			</div>
		</article>
	);
}

function ProductTemplatesSection({
	items,
	loading,
	online,
	packagingTypes,
	rawMaterialTypes,
	archiveItem,
}: {
	items: ProductTemplate[];
	loading: boolean;
	online: boolean;
	packagingTypes: PackagingType[];
	rawMaterialTypes: RawMaterialType[];
	archiveItem: (id: string) => Promise<unknown>;
}) {
	const queryClient = useQueryClient();
	const activeRawMaterialTypes = useMemo(
		() => rawMaterialTypes.filter((item) => item.active),
		[rawMaterialTypes],
	);
	const activePackagingTypes = useMemo(
		() => packagingTypes.filter((item) => item.active),
		[packagingTypes],
	);
	const [name, setName] = useState("");
	const [rawMaterialTypeId, setRawMaterialTypeId] = useState("");
	const [packagingTypeId, setPackagingTypeId] = useState("");
	const [priceRubles, setPriceRubles] = useState("");
	const [priceError, setPriceError] = useState("");
	const [showArchived, setShowArchived] = useState(false);
	const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
	const archivedItems = useMemo(() => items.filter((item) => !item.active), [items]);
	const visibleItems = showArchived ? archivedItems : activeItems;
	const createMutation = useMutation({
		mutationFn: createProductTemplate,
		onSuccess: async () => {
			setName("");
			setRawMaterialTypeId("");
			setPackagingTypeId("");
			setPriceRubles("");
			setPriceError("");
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const updateMutation = useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateProductTemplateRequest }) => updateProductTemplate(id, input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const archiveMutation = useMutation({
		mutationFn: archiveItem,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const dependenciesReady = activeRawMaterialTypes.length > 0 && activePackagingTypes.length > 0;

	function handleCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsedPrice = parsePriceRubles(priceRubles);
		if (!parsedPrice.ok) {
			setPriceError(parsedPrice.message);
			return;
		}
		setPriceError("");
		createMutation.mutate({
			name,
			rawMaterialTypeId,
			packagingTypeId,
			priceCents: parsedPrice.value,
		});
	}

	return (
		<div className="catalog-section">
			<form className="form-panel" onSubmit={handleCreate}>
				<div className="section-heading compact">
					<h2>Шаблон продукции</h2>
				</div>
				<label className="field">
					<span>Название</span>
					<input onChange={(event) => setName(event.target.value)} required type="text" value={name} />
				</label>
				<label className="field">
					<span>Связанный вид сырья</span>
					<select
						onChange={(event) => setRawMaterialTypeId(event.target.value)}
						required
						value={rawMaterialTypeId}
					>
						<option value="">Выберите сырье</option>
						{activeRawMaterialTypes.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Связанный вид тары</span>
					<select
						onChange={(event) => setPackagingTypeId(event.target.value)}
						required
						value={packagingTypeId}
					>
						<option value="">Выберите тару</option>
						{activePackagingTypes.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Цена продукции, ₽</span>
					<input
						inputMode="decimal"
						onChange={(event) => setPriceRubles(event.target.value)}
						placeholder="1250.00"
						required
						type="text"
						value={priceRubles}
					/>
				</label>
				{dependenciesReady ? null : (
					<p className="muted">Сначала нужны активные виды сырья и тары.</p>
				)}
				{priceError ? <p className="form-error">{priceError}</p> : null}
				{createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
				<button
					className="primary-button"
					disabled={!online || !dependenciesReady || createMutation.isPending}
					type="submit"
				>
					<Plus aria-hidden size={18} />
					Добавить
				</button>
			</form>

			<CatalogArchiveHeader
				archivedCount={archivedItems.length}
				showArchived={showArchived}
				onToggle={() => setShowArchived((current) => !current)}
			/>

			<CatalogListState
				count={visibleItems.length}
				emptyLabel={showArchived ? "В архиве пока пусто" : "Активных шаблонов пока нет"}
				loading={loading}
			/>

			<div className="list-stack">
				{visibleItems.map((item) => (
					<ProductTemplateListItem
						item={item}
						key={item.id}
						online={online}
						packagingTypes={activePackagingTypes}
						pending={updateMutation.isPending || archiveMutation.isPending}
						rawMaterialTypes={activeRawMaterialTypes}
						archiveItem={() => archiveMutation.mutate(item.id)}
						restoreItem={() => updateMutation.mutate({ id: item.id, input: { active: true } })}
						updateItem={(input) => updateMutation.mutate({ id: item.id, input })}
					/>
				))}
				{updateMutation.isError ? <p className="form-error">{updateMutation.error.message}</p> : null}
				{archiveMutation.isError ? <p className="form-error">{archiveMutation.error.message}</p> : null}
			</div>
		</div>
	);
}

function ProductTemplateListItem({
	item,
	online,
	packagingTypes,
	pending,
	rawMaterialTypes,
	archiveItem,
	restoreItem,
	updateItem,
}: {
	item: ProductTemplate;
	online: boolean;
	packagingTypes: PackagingType[];
	pending: boolean;
	rawMaterialTypes: RawMaterialType[];
	archiveItem: () => void;
	restoreItem: () => void;
	updateItem: (input: UpdateProductTemplateRequest) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(item.name);
	const [rawMaterialTypeId, setRawMaterialTypeId] = useState(item.rawMaterialTypeId);
	const [packagingTypeId, setPackagingTypeId] = useState(item.packagingTypeId);
	const [priceRubles, setPriceRubles] = useState(formatPriceRubles(item.priceCents));
	const [priceError, setPriceError] = useState("");

	function handleSave() {
		const parsedPrice = parsePriceRubles(priceRubles);
		if (!parsedPrice.ok) {
			setPriceError(parsedPrice.message);
			return;
		}
		setPriceError("");
		updateItem({
			name,
			rawMaterialTypeId,
			packagingTypeId,
			priceCents: parsedPrice.value,
		});
		setEditing(false);
	}

	if (editing) {
		return (
			<article className="entity-card edit-card">
				<label className="field">
					<span>Название</span>
					<input onChange={(event) => setName(event.target.value)} type="text" value={name} />
				</label>
				<label className="field">
					<span>Сырье</span>
					<select onChange={(event) => setRawMaterialTypeId(event.target.value)} value={rawMaterialTypeId}>
						{rawMaterialTypes.map((rawMaterialType) => (
							<option key={rawMaterialType.id} value={rawMaterialType.id}>
								{rawMaterialType.name}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Тара</span>
					<select onChange={(event) => setPackagingTypeId(event.target.value)} value={packagingTypeId}>
						{packagingTypes.map((packagingType) => (
							<option key={packagingType.id} value={packagingType.id}>
								{packagingType.name}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Цена, ₽</span>
					<input
						inputMode="decimal"
						onChange={(event) => setPriceRubles(event.target.value)}
						type="text"
						value={priceRubles}
					/>
				</label>
				{priceError ? <p className="form-error">{priceError}</p> : null}
				<div className="entity-actions">
					<button className="secondary-button" onClick={() => setEditing(false)} type="button">
						Отмена
					</button>
					<button className="secondary-button" disabled={!online || pending} onClick={handleSave} type="button">
						<Check aria-hidden size={16} />
						Сохранить
					</button>
				</div>
			</article>
		);
	}

	return (
		<article className="entity-card">
			<div>
				<strong>{item.name}</strong>
				<p>
					{item.rawMaterialType.name} / {item.packagingType.name}
				</p>
				<p>{formatPriceRubles(item.priceCents)} ₽</p>
			</div>
			<div className="entity-actions">
				<ArchiveButton
					active={item.active}
					disabled={!online || pending}
					onArchive={archiveItem}
					onRestore={restoreItem}
				/>
				<button
					aria-label={`Редактировать ${item.name}`}
					className="secondary-icon-button"
					disabled={!online || pending || !item.active}
					onClick={() => setEditing(true)}
					title="Редактировать"
					type="button"
				>
					<Edit3 aria-hidden size={16} />
				</button>
			</div>
		</article>
	);
}

function ArchiveButton({
	active,
	disabled,
	onArchive,
	onRestore,
}: {
	active: boolean;
	disabled: boolean;
	onArchive: () => void;
	onRestore: () => void;
}) {
	return (
		<button
			className={active ? "status-button archive" : "status-button restore"}
			disabled={disabled}
			onClick={active ? onArchive : onRestore}
			type="button"
		>
			{active ? <Archive aria-hidden size={14} /> : <Check aria-hidden size={14} />}
			{active ? "В архив" : "Вернуть"}
		</button>
	);
}

function CatalogArchiveHeader({
	archivedCount,
	showArchived,
	onToggle,
}: {
	archivedCount: number;
	showArchived: boolean;
	onToggle: () => void;
}) {
	return (
		<div className="catalog-list-header">
			<span>{showArchived ? "Архив" : "Активные записи"}</span>
			<button className="secondary-button compact-button" onClick={onToggle} type="button">
				{showArchived ? "Показать активные" : `Архив (${archivedCount})`}
			</button>
		</div>
	);
}

function CatalogListState({
	count,
	emptyLabel,
	loading,
}: {
	count: number;
	emptyLabel: string;
	loading: boolean;
}) {
	if (loading) {
		return <p className="muted">Загрузка справочника</p>;
	}

	if (count === 0) {
		return <p className="muted">{emptyLabel}</p>;
	}

	return null;
}

function formatPriceRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}

function parsePriceRubles(value: string): { ok: true; value: number } | { ok: false; message: string } {
	try {
		return {
			ok: true,
			value: rublePriceToCents(value),
		};
	} catch {
		return {
			ok: false,
			message: "Цена должна быть положительной суммой в рублях, максимум 2 знака после запятой.",
		};
	}
}
