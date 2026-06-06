"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Archive, Check, ClipboardList, Edit3, Package, Plus, Scale, Truck, type LucideIcon } from "lucide-react";
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
import { formatCompactMoneyCents } from "../../lib/money-format";
import { SegmentedControl } from "../../ui/SegmentedControl";

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
type CatalogNoticeState = {
	message: string;
	restoreItem?: { id: string; name: string };
};

const tabs: Array<{ value: CatalogTab; label: string; icon: LucideIcon }> = [
	{ value: "raw", label: "Сырье", icon: Scale },
	{ value: "packaging", label: "Тара", icon: Package },
	{ value: "distributors", label: "Распределители", icon: Truck },
	{ value: "products", label: "Шаблоны", icon: ClipboardList },
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
			<div className="section-heading compact">
				<h2>Справочники</h2>
			</div>

			<SegmentedControl
				ariaLabel="Разделы справочников"
				className="catalog-tabs"
				items={tabs}
				onChange={setActiveTab}
				value={activeTab}
			/>

			{activeTab === "raw" ? (
				<SimpleCatalogSection
					createItem={(input) => createRawMaterialType({ name: input.name, unit: input.unit ?? "" })}
					items={rawMaterialTypes.data?.rawMaterialTypes ?? []}
					loading={rawMaterialTypes.isLoading}
					online={online}
					queryKey={["catalog", "raw-material-types"]}
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
	unitLabel,
	updateItem,
}: {
	archiveItem: (id: string) => Promise<unknown>;
	createItem: (input: SimpleCatalogInput) => Promise<unknown>;
	items: SimpleCatalogItem[];
	loading: boolean;
	online: boolean;
	queryKey: readonly unknown[];
	unitLabel?: string;
	updateItem: (id: string, input: SimpleCatalogUpdate) => Promise<unknown>;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [unit, setUnit] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [notice, setNotice] = useState<CatalogNoticeState | null>(null);
	const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
	const archivedItems = useMemo(() => items.filter((item) => !item.active), [items]);
	const visibleItems = showArchived ? archivedItems : activeItems;
	const createMutation = useMutation({
		mutationFn: createItem,
		onSuccess: async () => {
			setName("");
			setUnit("");
			setCreateOpen(false);
			setNotice({ message: "Запись добавлена." });
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const updateMutation = useMutation({
		mutationFn: ({ id, input }: { id: string; input: SimpleCatalogUpdate }) => updateItem(id, input),
		onSuccess: async (_result, variables) => {
			setNotice({ message: variables.input.active ? "Запись восстановлена." : "Изменения сохранены." });
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const archiveMutation = useMutation({
		mutationFn: (item: SimpleCatalogItem) => archiveItem(item.id),
		onSuccess: async (_result, item) => {
			setNotice({
				message: `${item.name} в архиве.`,
				restoreItem: { id: item.id, name: item.name },
			});
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const noticeRestoreItem = notice?.restoreItem;
	const noticeRestoreAction = noticeRestoreItem
		? () => {
				setNotice(null);
				updateMutation.mutate({ id: noticeRestoreItem.id, input: { active: true } });
			}
		: undefined;

	function handleCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setNotice(null);
		createMutation.mutate({
			name,
			...(unitLabel ? { unit } : {}),
		});
	}

	return (
		<div className="catalog-section management-surface">
			<CatalogListToolbar
				archivedCount={archivedItems.length}
				onCreate={() => setCreateOpen(true)}
				onToggleArchive={() => setShowArchived((current) => !current)}
				online={online}
				showArchived={showArchived}
				visibleCount={visibleItems.length}
			/>

			{createOpen ? (
				<form className="form-panel" onSubmit={handleCreate}>
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
					<div className="entity-actions">
						<button
							className="secondary-button"
							onClick={() => {
								setName("");
								setUnit("");
								createMutation.reset();
								setCreateOpen(false);
								setNotice(null);
							}}
							type="button"
						>
							Отмена
						</button>
						<button className="primary-button" disabled={!online || createMutation.isPending} type="submit">
							<Plus aria-hidden size={18} />
							Добавить
						</button>
					</div>
				</form>
			) : null}

			<CatalogListState
				count={visibleItems.length}
				emptyLabel={showArchived ? "В архиве пока пусто" : "Активных записей пока нет"}
				loading={loading}
			/>

			{notice ? (
				<CatalogNotice
					action={noticeRestoreAction}
					actionDisabled={updateMutation.isPending}
					actionLabel={notice.restoreItem ? "Вернуть" : undefined}
					message={notice.message}
				/>
			) : null}

			<div className="list-stack">
				{visibleItems.map((item) => (
					<SimpleCatalogListItem
						item={item}
						key={item.id}
						online={online}
						pending={updateMutation.isPending || archiveMutation.isPending}
						{...(unitLabel ? { unitLabel } : {})}
						archiveItem={() => {
							setNotice(null);
							archiveMutation.mutate(item);
						}}
						restoreItem={() => {
							setNotice(null);
							updateMutation.mutate({ id: item.id, input: { active: true } });
						}}
						updateItem={(input) => {
							setNotice(null);
							updateMutation.mutate({ id: item.id, input });
						}}
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
	const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
	const [name, setName] = useState(item.name);
	const unitValue = "unit" in item ? item.unit : "";
	const [unit, setUnit] = useState(unitValue);

	function handleSave() {
		updateItem({
			name,
			...(unitLabel ? { unit } : {}),
		});
		setArchiveConfirmOpen(false);
		setEditing(false);
	}

	if (editing) {
		return (
			<article className="form-panel edit-card">
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
		<article className="catalog-list-row">
			<div className="catalog-item-main">
				<strong>{item.name}</strong>
				{unitLabel ? <p>{unitValue}</p> : null}
			</div>
			<div className="entity-actions">
				{item.active && archiveConfirmOpen ? null : (
					<ArchiveButton
						active={item.active}
						disabled={!online || pending}
						onArchive={() => setArchiveConfirmOpen(true)}
						onRestore={restoreItem}
					/>
				)}
				{archiveConfirmOpen || !item.active ? null : (
					<button
						aria-label={`Редактировать ${item.name}`}
						className="secondary-icon-button"
						disabled={!online || pending}
						onClick={() => {
							setArchiveConfirmOpen(false);
							setEditing(true);
						}}
						title="Редактировать"
						type="button"
					>
						<Edit3 aria-hidden size={16} />
					</button>
				)}
			</div>
			{item.active && archiveConfirmOpen ? (
				<div className="catalog-row-confirm" role="group" aria-label={`Подтвердить архив ${item.name}`}>
					<span>Убрать в архив?</span>
					<div>
						<button className="secondary-button compact-button" onClick={() => setArchiveConfirmOpen(false)} type="button">
							Нет
						</button>
						<button
							className="status-button archive"
							disabled={!online || pending}
							onClick={() => {
								archiveItem();
								setArchiveConfirmOpen(false);
							}}
							type="button"
						>
							<Archive aria-hidden size={14} />
							В архив
						</button>
					</div>
				</div>
			) : null}
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
	const [createOpen, setCreateOpen] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [notice, setNotice] = useState<CatalogNoticeState | null>(null);
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
			setCreateOpen(false);
			setNotice({ message: "Шаблон добавлен." });
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const updateMutation = useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateProductTemplateRequest }) => updateProductTemplate(id, input),
		onSuccess: async (_result, variables) => {
			setNotice({ message: variables.input.active ? "Шаблон восстановлен." : "Изменения сохранены." });
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const archiveMutation = useMutation({
		mutationFn: (item: ProductTemplate) => archiveItem(item.id),
		onSuccess: async (_result, item) => {
			setNotice({
				message: `${item.name} в архиве.`,
				restoreItem: { id: item.id, name: item.name },
			});
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const noticeRestoreItem = notice?.restoreItem;
	const noticeRestoreAction = noticeRestoreItem
		? () => {
				setNotice(null);
				updateMutation.mutate({ id: noticeRestoreItem.id, input: { active: true } });
			}
		: undefined;
	const dependenciesReady = activeRawMaterialTypes.length > 0 && activePackagingTypes.length > 0;

	function handleCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsedPrice = parsePriceRubles(priceRubles);
		if (!parsedPrice.ok) {
			setPriceError(parsedPrice.message);
			return;
		}
		setPriceError("");
		setNotice(null);
		createMutation.mutate({
			name,
			rawMaterialTypeId,
			packagingTypeId,
			priceCents: parsedPrice.value,
		});
	}

	return (
		<div className="catalog-section management-surface">
			<CatalogListToolbar
				archivedCount={archivedItems.length}
				onCreate={() => setCreateOpen(true)}
				onToggleArchive={() => setShowArchived((current) => !current)}
				online={online}
				showArchived={showArchived}
				visibleCount={visibleItems.length}
			/>

			{createOpen ? (
				<form className="form-panel catalog-product-form" onSubmit={handleCreate}>
					<div className="catalog-form-group">
						<label className="field">
							<span>Название шаблона</span>
							<input onChange={(event) => setName(event.target.value)} required type="text" value={name} />
						</label>
					</div>

					<div className="catalog-form-group">
						<div className="catalog-form-grid">
							<label className="field">
								<span>Сырье</span>
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
								<span>Тара</span>
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
						</div>
					</div>

					<div className="catalog-form-group">
						<label className="field">
							<span>Цена за единицу, ₽</span>
							<input
								inputMode="decimal"
								onChange={(event) => setPriceRubles(event.target.value)}
								placeholder="1250"
								required
								type="text"
								value={priceRubles}
							/>
						</label>
					</div>
					{dependenciesReady ? null : (
						<p className="muted">Сначала нужны активные виды сырья и тары.</p>
					)}
					{priceError ? <p className="form-error">{priceError}</p> : null}
					{createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
					<div className="entity-actions">
						<button
							className="secondary-button"
							onClick={() => {
								setName("");
								setRawMaterialTypeId("");
								setPackagingTypeId("");
								setPriceRubles("");
								setPriceError("");
								createMutation.reset();
								setCreateOpen(false);
								setNotice(null);
							}}
							type="button"
						>
							Отмена
						</button>
						<button
							className="primary-button"
							disabled={!online || !dependenciesReady || createMutation.isPending}
							type="submit"
						>
							<Plus aria-hidden size={18} />
							Добавить
						</button>
					</div>
				</form>
			) : null}

			<CatalogListState
				count={visibleItems.length}
				emptyLabel={showArchived ? "В архиве пока пусто" : "Активных шаблонов пока нет"}
				loading={loading}
			/>

			{notice ? (
				<CatalogNotice
					action={noticeRestoreAction}
					actionDisabled={updateMutation.isPending}
					actionLabel={notice.restoreItem ? "Вернуть" : undefined}
					message={notice.message}
				/>
			) : null}

			<div className="list-stack">
				{visibleItems.map((item) => (
					<ProductTemplateListItem
						item={item}
						key={item.id}
						online={online}
						packagingTypes={activePackagingTypes}
						pending={updateMutation.isPending || archiveMutation.isPending}
						rawMaterialTypes={activeRawMaterialTypes}
						archiveItem={() => {
							setNotice(null);
							archiveMutation.mutate(item);
						}}
						restoreItem={() => {
							setNotice(null);
							updateMutation.mutate({ id: item.id, input: { active: true } });
						}}
						updateItem={(input) => {
							setNotice(null);
							updateMutation.mutate({ id: item.id, input });
						}}
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
	const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
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
		setArchiveConfirmOpen(false);
		setEditing(false);
	}

	if (editing) {
		return (
			<article className="form-panel edit-card catalog-product-form">
				<div className="catalog-form-group">
					<label className="field">
						<span>Название шаблона</span>
						<input onChange={(event) => setName(event.target.value)} type="text" value={name} />
					</label>
				</div>

				<div className="catalog-form-group">
					<div className="catalog-form-grid">
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
					</div>
				</div>

				<div className="catalog-form-group">
					<label className="field">
						<span>Цена за единицу, ₽</span>
						<input
							inputMode="decimal"
							onChange={(event) => setPriceRubles(event.target.value)}
							type="text"
							value={priceRubles}
						/>
					</label>
				</div>
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
		<article className="catalog-list-row">
			<div className="catalog-item-main">
				<strong>{item.name}</strong>
				<p>
					{item.rawMaterialType.name} / {item.packagingType.name}
				</p>
				<p>{formatCompactMoneyCents(item.priceCents)} ₽</p>
			</div>
			<div className="entity-actions">
				{item.active && archiveConfirmOpen ? null : (
					<ArchiveButton
						active={item.active}
						disabled={!online || pending}
						onArchive={() => setArchiveConfirmOpen(true)}
						onRestore={restoreItem}
					/>
				)}
				{archiveConfirmOpen || !item.active ? null : (
					<button
						aria-label={`Редактировать ${item.name}`}
						className="secondary-icon-button"
						disabled={!online || pending}
						onClick={() => {
							setArchiveConfirmOpen(false);
							setEditing(true);
						}}
						title="Редактировать"
						type="button"
					>
						<Edit3 aria-hidden size={16} />
					</button>
				)}
			</div>
			{item.active && archiveConfirmOpen ? (
				<div className="catalog-row-confirm" role="group" aria-label={`Подтвердить архив ${item.name}`}>
					<span>Убрать в архив?</span>
					<div>
						<button className="secondary-button compact-button" onClick={() => setArchiveConfirmOpen(false)} type="button">
							Нет
						</button>
						<button
							className="status-button archive"
							disabled={!online || pending}
							onClick={() => {
								archiveItem();
								setArchiveConfirmOpen(false);
							}}
							type="button"
						>
							<Archive aria-hidden size={14} />
							В архив
						</button>
					</div>
				</div>
			) : null}
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
			aria-label={active ? "В архив" : undefined}
			className={active ? "status-button archive" : "status-button restore"}
			disabled={disabled}
			onClick={active ? onArchive : onRestore}
			title={active ? "В архив" : undefined}
			type="button"
		>
			{active ? <Archive aria-hidden size={14} /> : <Check aria-hidden size={14} />}
			<span>{active ? "В архив" : "Вернуть"}</span>
		</button>
	);
}

function CatalogNotice({
	action,
	actionDisabled = false,
	actionLabel,
	message,
}: {
	action?: (() => void) | undefined;
	actionDisabled?: boolean;
	actionLabel?: string | undefined;
	message: string;
}) {
	return (
		<div className="catalog-notice" role="status">
			<span>{message}</span>
			{action && actionLabel ? (
				<button className="status-button restore" disabled={actionDisabled} onClick={action} type="button">
					<Check aria-hidden size={14} />
					{actionLabel}
				</button>
			) : null}
		</div>
	);
}

function CatalogListToolbar({
	archivedCount,
	onCreate,
	onToggleArchive,
	online,
	showArchived,
	visibleCount,
}: {
	archivedCount: number;
	onCreate: () => void;
	onToggleArchive: () => void;
	online: boolean;
	showArchived: boolean;
	visibleCount: number;
}) {
	return (
		<div className="catalog-list-toolbar">
			<span>{showArchived ? `${visibleCount} в архиве` : `${visibleCount} активных`}</span>
			<div>
				<button
					className="secondary-button compact-button"
					disabled={!online}
					onClick={onCreate}
					type="button"
				>
					<Plus aria-hidden size={16} />
					Новый
				</button>
				<button className="secondary-button compact-button" onClick={onToggleArchive} type="button">
					{showArchived ? "Показать активные" : `Архив (${archivedCount})`}
				</button>
			</div>
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
