"use client";

import {
	ArrowRightLeft,
	ChevronRight,
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
			<ProductionWorkshopSummary
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

			<div className="production-command-panel" aria-label="Действия производства">
				<div className="production-command-group frequent" aria-label="Частые действия">
					<ProductionCommandButton
						icon={Factory}
						label="Выпустить"
						disabled={!online}
						onClick={onOpenBatchRelease}
						tone="frequent"
					/>
					<ProductionCommandButton
						icon={ArrowRightLeft}
						label="Передать"
						disabled={!online}
						onClick={onOpenTransfer}
						tone="frequent"
					/>
				</div>
				<div className="production-command-group supporting" aria-label="Приход в цех">
					<ProductionCommandButton
						icon={CirclePlus}
						label="Добавить сырье"
						disabled={!online}
						onClick={onOpenRawIntake}
						tone="supporting"
					/>
					<ProductionCommandButton
						icon={PackagePlus}
						label="Добавить тару"
						disabled={!online}
						onClick={onOpenPackagingIntake}
						tone="supporting"
					/>
				</div>
				{online ? null : <p className="production-command-note">Нет сети: операции записи недоступны</p>}
			</div>
		</>
	);
}

function ProductionCommandButton({
	disabled,
	icon: Icon,
	label,
	onClick,
	tone,
}: {
	disabled: boolean;
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	tone: "frequent" | "supporting";
}) {
	return (
		<button className={`production-command-button ${tone}`} disabled={disabled} onClick={onClick} type="button">
			<Icon aria-hidden size={18} />
			<span>{label}</span>
		</button>
	);
}

function ProductionWorkshopSummary({
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
		<section className="production-home-surface" aria-labelledby="production-home-heading">
			<div className="production-home-heading">
				<h2 id="production-home-heading">Цех</h2>
				<span>Остатки</span>
			</div>

			<div className="production-summary-ledger" aria-label="Сводка цеха">
				<ProductionSummaryRow
					icon={PackageCheck}
					label="Продукция"
					loading={loading}
					meta="В цеху"
					onClick={onOpenProducts}
					value={`${readyProductUnits} шт`}
				/>
				<ProductionSummaryRow
					icon={FishSymbol}
					label="Сырье"
					loading={loading}
					meta={`${rawMaterialKinds} ${formatKindsLabel(rawMaterialKinds)}`}
					onClick={onOpenRawMaterials}
					value={rawMaterialLabel}
				/>
				<ProductionSummaryRow
					icon={Package}
					label="Тара"
					loading={loading}
					meta={`${packagingKinds} ${formatKindsLabel(packagingKinds)}`}
					onClick={onOpenPackaging}
					value={packagingLabel}
				/>
			</div>
		</section>
	);
}

function ProductionSummaryRow({
	icon: Icon,
	label,
	loading,
	meta,
	onClick,
	value,
}: {
	icon: LucideIcon;
	label: string;
	loading: boolean;
	meta: string;
	onClick: () => void;
	value: string;
}) {
	const displayValue = loading ? "..." : value;
	const displayMeta = loading ? "Загрузка" : meta;

	return (
		<button
			aria-label={`${label}: ${displayValue}, ${displayMeta}. Открыть список`}
			className="production-summary-row"
			disabled={loading}
			onClick={onClick}
			type="button"
		>
			<span className="production-summary-icon" aria-hidden>
				<Icon size={17} />
			</span>
			<span className="production-summary-main">
				<span>{label}</span>
				<strong>{displayValue}</strong>
			</span>
			<span className="production-summary-meta">
				<span>{displayMeta}</span>
				<ChevronRight aria-hidden size={16} />
			</span>
		</button>
	);
}

function formatKindsLabel(count: number): string {
	const lastTwoDigits = Math.abs(count) % 100;
	const lastDigit = Math.abs(count) % 10;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return "видов";
	}
	if (lastDigit === 1) {
		return "вид";
	}
	if (lastDigit >= 2 && lastDigit <= 4) {
		return "вида";
	}

	return "видов";
}
