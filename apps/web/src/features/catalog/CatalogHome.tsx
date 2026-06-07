"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, Check, Edit3, Plus, X } from "lucide-react";
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
type ProductTemplateFormInput = {
	name: string;
	rawMaterialTypeId: string;
	packagingTypeId: string;
	priceCents: number;
};
type CatalogNoticeState = {
	message: string;
	restoreItem?: { id: string; name: string };
};

const tabs: Array<{ value: CatalogTab; label: string }> = [
	{ value: "raw", label: "Сырье" },
	{ value: "packaging", label: "Тара" },
	{ value: "distributors", label: "Распределители" },
	{ value: "products", label: "Шаблоны" },
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
	const [createOpen, setCreateOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<SimpleCatalogItem | null>(null);
	const [archiveTarget, setArchiveTarget] = useState<SimpleCatalogItem | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [notice, setNotice] = useState<CatalogNoticeState | null>(null);
	const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
	const archivedItems = useMemo(() => items.filter((item) => !item.active), [items]);
	const visibleItems = showArchived ? archivedItems : activeItems;
	const createMutation = useMutation({
		mutationFn: createItem,
		onSuccess: async () => {
			setCreateOpen(false);
			setNotice({ message: "Запись добавлена." });
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const updateMutation = useMutation({
		mutationFn: ({ id, input }: { id: string; input: SimpleCatalogUpdate }) => updateItem(id, input),
		onSuccess: async (_result, variables) => {
			setEditingItem(null);
			setNotice({ message: variables.input.active ? "Запись восстановлена." : "Изменения сохранены." });
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const archiveMutation = useMutation({
		mutationFn: (item: SimpleCatalogItem) => archiveItem(item.id),
		onSuccess: async (_result, item) => {
			setArchiveTarget(null);
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

			<SimpleCatalogFormDialog
				error={createMutation.isError ? createMutation.error.message : null}
				item={null}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) {
						createMutation.reset();
					}
				}}
				onSubmit={(input) => {
					setNotice(null);
					createMutation.mutate(input);
				}}
				online={online}
				open={createOpen}
				pending={createMutation.isPending}
				submitLabel="Добавить"
				title="Новая запись"
				{...(unitLabel ? { unitLabel } : {})}
			/>

			<SimpleCatalogFormDialog
				error={updateMutation.isError && editingItem ? updateMutation.error.message : null}
				item={editingItem}
				onOpenChange={(open) => {
					if (!open) {
						setEditingItem(null);
						updateMutation.reset();
					}
				}}
				onSubmit={(input) => {
					if (!editingItem) {
						return;
					}
					setNotice(null);
					updateMutation.mutate({ id: editingItem.id, input });
				}}
				online={online}
				open={Boolean(editingItem)}
				pending={updateMutation.isPending}
				submitLabel="Сохранить"
				title="Редактировать запись"
				{...(unitLabel ? { unitLabel } : {})}
			/>

			<CatalogArchiveDialog
				error={archiveMutation.isError ? archiveMutation.error.message : null}
				itemName={archiveTarget?.name ?? ""}
				onConfirm={() => {
					if (archiveTarget) {
						setNotice(null);
						archiveMutation.mutate(archiveTarget);
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setArchiveTarget(null);
						archiveMutation.reset();
					}
				}}
				open={Boolean(archiveTarget)}
				pending={archiveMutation.isPending}
			/>

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
							setArchiveTarget(item);
						}}
						editItem={() => setEditingItem(item)}
						restoreItem={() => {
							setNotice(null);
							updateMutation.mutate({ id: item.id, input: { active: true } });
						}}
					/>
				))}
				{updateMutation.isError && !editingItem ? <p className="form-error">{updateMutation.error.message}</p> : null}
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
	editItem,
	restoreItem,
}: {
	item: SimpleCatalogItem;
	online: boolean;
	pending: boolean;
	unitLabel?: string;
	archiveItem: () => void;
	editItem: () => void;
	restoreItem: () => void;
}) {
	const unitValue = "unit" in item ? item.unit : "";

	return (
		<article className="catalog-list-row">
			<div className="catalog-item-main">
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
				{item.active ? (
					<button
						aria-label={`Редактировать ${item.name}`}
						className="secondary-icon-button"
						disabled={!online || pending}
						onClick={editItem}
						title="Редактировать"
						type="button"
					>
						<Edit3 aria-hidden size={16} />
					</button>
				) : null}
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
	const [createOpen, setCreateOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ProductTemplate | null>(null);
	const [archiveTarget, setArchiveTarget] = useState<ProductTemplate | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [notice, setNotice] = useState<CatalogNoticeState | null>(null);
	const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
	const archivedItems = useMemo(() => items.filter((item) => !item.active), [items]);
	const visibleItems = showArchived ? archivedItems : activeItems;
	const createMutation = useMutation({
		mutationFn: createProductTemplate,
		onSuccess: async () => {
			setCreateOpen(false);
			setNotice({ message: "Шаблон добавлен." });
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const updateMutation = useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateProductTemplateRequest }) => updateProductTemplate(id, input),
		onSuccess: async (_result, variables) => {
			setEditingItem(null);
			setNotice({ message: variables.input.active ? "Шаблон восстановлен." : "Изменения сохранены." });
			await queryClient.invalidateQueries({ queryKey: ["catalog", "product-templates"] });
		},
	});
	const archiveMutation = useMutation({
		mutationFn: (item: ProductTemplate) => archiveItem(item.id),
		onSuccess: async (_result, item) => {
			setArchiveTarget(null);
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

			<ProductTemplateFormDialog
				dependenciesReady={dependenciesReady}
				error={createMutation.isError ? createMutation.error.message : null}
				item={null}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) {
						createMutation.reset();
					}
				}}
				onSubmit={(input) => {
					setNotice(null);
					createMutation.mutate(input);
				}}
				online={online}
				open={createOpen}
				packagingTypes={activePackagingTypes}
				pending={createMutation.isPending}
				rawMaterialTypes={activeRawMaterialTypes}
				submitLabel="Добавить"
				title="Новый шаблон"
			/>

			<ProductTemplateFormDialog
				dependenciesReady={dependenciesReady}
				error={updateMutation.isError && editingItem ? updateMutation.error.message : null}
				item={editingItem}
				onOpenChange={(open) => {
					if (!open) {
						setEditingItem(null);
						updateMutation.reset();
					}
				}}
				onSubmit={(input) => {
					if (!editingItem) {
						return;
					}
					setNotice(null);
					updateMutation.mutate({ id: editingItem.id, input });
				}}
				online={online}
				open={Boolean(editingItem)}
				packagingTypes={activePackagingTypes}
				pending={updateMutation.isPending}
				rawMaterialTypes={activeRawMaterialTypes}
				submitLabel="Сохранить"
				title="Редактировать шаблон"
			/>

			<CatalogArchiveDialog
				error={archiveMutation.isError ? archiveMutation.error.message : null}
				itemName={archiveTarget?.name ?? ""}
				onConfirm={() => {
					if (archiveTarget) {
						setNotice(null);
						archiveMutation.mutate(archiveTarget);
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setArchiveTarget(null);
						archiveMutation.reset();
					}
				}}
				open={Boolean(archiveTarget)}
				pending={archiveMutation.isPending}
			/>

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
						pending={updateMutation.isPending || archiveMutation.isPending}
						archiveItem={() => {
							setArchiveTarget(item);
						}}
						editItem={() => setEditingItem(item)}
						restoreItem={() => {
							setNotice(null);
							updateMutation.mutate({ id: item.id, input: { active: true } });
						}}
					/>
				))}
				{updateMutation.isError && !editingItem ? <p className="form-error">{updateMutation.error.message}</p> : null}
			</div>
		</div>
	);
}

function ProductTemplateListItem({
	item,
	online,
	pending,
	archiveItem,
	editItem,
	restoreItem,
}: {
	item: ProductTemplate;
	online: boolean;
	pending: boolean;
	archiveItem: () => void;
	editItem: () => void;
	restoreItem: () => void;
}) {
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
				<ArchiveButton
					active={item.active}
					disabled={!online || pending}
					onArchive={archiveItem}
					onRestore={restoreItem}
				/>
				{item.active ? (
					<button
						aria-label={`Редактировать ${item.name}`}
						className="secondary-icon-button"
						disabled={!online || pending}
						onClick={editItem}
						title="Редактировать"
						type="button"
					>
						<Edit3 aria-hidden size={16} />
					</button>
				) : null}
			</div>
		</article>
	);
}

function SimpleCatalogFormDialog({
	error,
	item,
	onOpenChange,
	onSubmit,
	online,
	open,
	pending,
	submitLabel,
	title,
	unitLabel,
}: {
	error: string | null;
	item: SimpleCatalogItem | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: SimpleCatalogInput) => void;
	online: boolean;
	open: boolean;
	pending: boolean;
	submitLabel: string;
	title: string;
	unitLabel?: string;
}) {
	const [name, setName] = useState("");
	const [unit, setUnit] = useState("");

	useEffect(() => {
		if (!open) {
			return;
		}

		setName(item?.name ?? "");
		setUnit(item && "unit" in item ? item.unit : "");
	}, [item, open]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSubmit({
			name,
			...(unitLabel ? { unit } : {}),
		});
	}

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content aria-describedby={undefined} className="operation-dialog catalog-dialog">
					<div className="operation-dialog-heading">
						<Dialog.Title>{title}</Dialog.Title>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					<form className="catalog-dialog-form" onSubmit={handleSubmit}>
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
						{error ? <p className="form-error">{error}</p> : null}
						<div className="form-actions">
							<Dialog.Close className="secondary-button" type="button">
								Отмена
							</Dialog.Close>
							<button className="primary-button" disabled={!online || pending} type="submit">
								{submitLabel === "Сохранить" ? <Check aria-hidden size={18} /> : <Plus aria-hidden size={18} />}
								{submitLabel}
							</button>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function ProductTemplateFormDialog({
	dependenciesReady,
	error,
	item,
	onOpenChange,
	onSubmit,
	online,
	open,
	packagingTypes,
	pending,
	rawMaterialTypes,
	submitLabel,
	title,
}: {
	dependenciesReady: boolean;
	error: string | null;
	item: ProductTemplate | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: ProductTemplateFormInput) => void;
	online: boolean;
	open: boolean;
	packagingTypes: PackagingType[];
	pending: boolean;
	rawMaterialTypes: RawMaterialType[];
	submitLabel: string;
	title: string;
}) {
	const [name, setName] = useState("");
	const [rawMaterialTypeId, setRawMaterialTypeId] = useState("");
	const [packagingTypeId, setPackagingTypeId] = useState("");
	const [priceRubles, setPriceRubles] = useState("");
	const [priceError, setPriceError] = useState("");

	useEffect(() => {
		if (!open) {
			return;
		}

		setName(item?.name ?? "");
		setRawMaterialTypeId(item?.rawMaterialTypeId ?? "");
		setPackagingTypeId(item?.packagingTypeId ?? "");
		setPriceRubles(item ? formatPriceRubles(item.priceCents) : "");
		setPriceError("");
	}, [item, open]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsedPrice = parsePriceRubles(priceRubles);
		if (!parsedPrice.ok) {
			setPriceError(parsedPrice.message);
			return;
		}

		setPriceError("");
		onSubmit({
			name,
			rawMaterialTypeId,
			packagingTypeId,
			priceCents: parsedPrice.value,
		});
	}

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content aria-describedby={undefined} className="operation-dialog catalog-dialog">
					<div className="operation-dialog-heading">
						<Dialog.Title>{title}</Dialog.Title>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					<form className="catalog-dialog-form catalog-product-form" onSubmit={handleSubmit}>
						<label className="field">
							<span>Название шаблона</span>
							<input onChange={(event) => setName(event.target.value)} required type="text" value={name} />
						</label>
						<div className="catalog-form-grid">
							<label className="field">
								<span>Сырье</span>
								<select
									onChange={(event) => setRawMaterialTypeId(event.target.value)}
									required
									value={rawMaterialTypeId}
								>
									<option value="">Выберите сырье</option>
									{rawMaterialTypes.map((rawMaterialType) => (
										<option key={rawMaterialType.id} value={rawMaterialType.id}>
											{rawMaterialType.name}
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
									{packagingTypes.map((packagingType) => (
										<option key={packagingType.id} value={packagingType.id}>
											{packagingType.name}
										</option>
									))}
								</select>
							</label>
						</div>
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
						{dependenciesReady ? null : (
							<p className="muted">Сначала нужны активные виды сырья и тары.</p>
						)}
						{priceError ? <p className="form-error">{priceError}</p> : null}
						{error ? <p className="form-error">{error}</p> : null}
						<div className="form-actions">
							<Dialog.Close className="secondary-button" type="button">
								Отмена
							</Dialog.Close>
							<button
								className="primary-button"
								disabled={!online || !dependenciesReady || pending}
								type="submit"
							>
								{submitLabel === "Сохранить" ? <Check aria-hidden size={18} /> : <Plus aria-hidden size={18} />}
								{submitLabel}
							</button>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function CatalogArchiveDialog({
	error,
	itemName,
	onConfirm,
	onOpenChange,
	open,
	pending,
}: {
	error: string | null;
	itemName: string;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	pending: boolean;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content aria-describedby={undefined} className="operation-dialog catalog-dialog catalog-archive-dialog">
					<div className="operation-dialog-heading">
						<Dialog.Title className="catalog-archive-title">{itemName}</Dialog.Title>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					{error ? <p className="form-error">{error}</p> : null}
					<div className="form-actions">
						<Dialog.Close className="secondary-button" type="button">
							Отмена
						</Dialog.Close>
						<button className="status-button archive" disabled={pending} onClick={onConfirm} type="button">
							<Archive aria-hidden size={14} />
							Архив
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
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
					Добавить
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
