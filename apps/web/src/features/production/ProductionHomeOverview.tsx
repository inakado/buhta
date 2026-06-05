"use client";

import {
	ArrowRightLeft,
	CirclePlus,
	Factory,
	FishSymbol,
	Package,
	PackageCheck,
	PackagePlus,
	type LucideIcon,
} from "lucide-react";

export function ProductionHomeOverview({
	loading,
	onOpenBatchRelease,
	onOpenPackaging,
	onOpenPackagingIntake,
	onOpenProducts,
	onOpenRawIntake,
	onOpenRawMaterials,
	onOpenTransfer,
	online,
	packagingKinds,
	packagingLabel,
	rawMaterialKinds,
	rawMaterialLabel,
	readyProductUnits,
}: {
	loading: boolean;
	onOpenBatchRelease: () => void;
	onOpenPackaging: () => void;
	onOpenPackagingIntake: () => void;
	onOpenProducts: () => void;
	onOpenRawIntake: () => void;
	onOpenRawMaterials: () => void;
	onOpenTransfer: () => void;
	online: boolean;
	packagingKinds: number;
	packagingLabel: string;
	rawMaterialKinds: number;
	rawMaterialLabel: string;
	readyProductUnits: number;
}) {
	return (
		<>
			<ProductionWorkshopCard
				loading={loading}
				onOpenPackaging={onOpenPackaging}
				onOpenProducts={onOpenProducts}
				onOpenRawMaterials={onOpenRawMaterials}
				packagingKinds={packagingKinds}
				packagingLabel={packagingLabel}
				rawMaterialKinds={rawMaterialKinds}
				rawMaterialLabel={rawMaterialLabel}
				readyProductUnits={readyProductUnits}
			/>

			<div className="action-grid">
				<button className="action-tile primary-action" disabled={!online} onClick={onOpenBatchRelease} type="button">
					<Factory aria-hidden size={22} />
					<span>Выпустить</span>
				</button>
				<button className="action-tile" disabled={!online} onClick={onOpenTransfer} type="button">
					<ArrowRightLeft aria-hidden size={22} />
					<span>Передать</span>
				</button>
				<button className="action-tile" disabled={!online} onClick={onOpenRawIntake} type="button">
					<CirclePlus aria-hidden size={22} />
					<span>Добавить сырье</span>
				</button>
				<button className="action-tile" disabled={!online} onClick={onOpenPackagingIntake} type="button">
					<PackagePlus aria-hidden size={22} />
					<span>Добавить тару</span>
				</button>
			</div>
		</>
	);
}

function ProductionWorkshopCard({
	loading,
	onOpenPackaging,
	onOpenProducts,
	onOpenRawMaterials,
	packagingKinds,
	packagingLabel,
	rawMaterialKinds,
	rawMaterialLabel,
	readyProductUnits,
}: {
	loading: boolean;
	onOpenPackaging: () => void;
	onOpenProducts: () => void;
	onOpenRawMaterials: () => void;
	packagingKinds: number;
	packagingLabel: string;
	rawMaterialKinds: number;
	rawMaterialLabel: string;
	readyProductUnits: number;
}) {
	return (
		<article className="production-workshop-card" aria-label="Цех">
			<button
				aria-label={`Продукция ${readyProductUnits} шт`}
				className="production-workshop-main"
				disabled={loading}
				onClick={onOpenProducts}
				type="button"
			>
				<div>
					<span className="production-workshop-kicker">Цех</span>
					<strong>{loading ? "..." : `${readyProductUnits} шт`}</strong>
					<span className="production-workshop-label">Продукция</span>
				</div>
				<span className="production-workshop-icon" aria-hidden>
					<PackageCheck size={24} />
				</span>
			</button>

			<div className="production-resource-band">
				<ResourceMetricButton
					icon={FishSymbol}
					kinds={rawMaterialKinds}
					label="Сырье"
					loading={loading}
					onClick={onOpenRawMaterials}
					value={rawMaterialLabel}
				/>
				<ResourceMetricButton
					icon={Package}
					kinds={packagingKinds}
					label="Тара"
					loading={loading}
					onClick={onOpenPackaging}
					value={packagingLabel}
				/>
			</div>
		</article>
	);
}

function ResourceMetricButton({
	icon: Icon,
	kinds,
	label,
	loading,
	onClick,
	value,
}: {
	icon: LucideIcon;
	kinds: number;
	label: string;
	loading: boolean;
	onClick: () => void;
	value: string;
}) {
	return (
		<button className="production-resource-action" disabled={loading} onClick={onClick} type="button">
			<span className="production-resource-heading">
				<Icon aria-hidden size={16} />
				{label}
			</span>
			<strong>{loading ? "..." : value}</strong>
			<span>{loading ? "Загрузка" : `${kinds} видов`}</span>
		</button>
	);
}
