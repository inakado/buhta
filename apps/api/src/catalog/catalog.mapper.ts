import type {
	Distributor,
	PackagingType,
	ProductTemplate,
	RawMaterialType,
} from "@buhta/shared";

type CatalogRecord = {
	id: string;
	name: string;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
};

type UnitCatalogRecord = CatalogRecord & {
	unit: string;
};

type ProductTemplateRecord = CatalogRecord & {
	rawMaterialTypeId: string;
	packagingTypeId: string;
	priceCents: number;
	rawMaterialType: UnitCatalogRecord;
	packagingType: UnitCatalogRecord;
};

export function mapRawMaterialType(record: UnitCatalogRecord): RawMaterialType {
	return {
		id: record.id,
		name: record.name,
		unit: record.unit,
		active: record.active,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapPackagingType(record: UnitCatalogRecord): PackagingType {
	return {
		id: record.id,
		name: record.name,
		unit: record.unit,
		active: record.active,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributor(record: CatalogRecord): Distributor {
	return {
		id: record.id,
		name: record.name,
		active: record.active,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapProductTemplate(record: ProductTemplateRecord): ProductTemplate {
	return {
		id: record.id,
		name: record.name,
		rawMaterialTypeId: record.rawMaterialTypeId,
		packagingTypeId: record.packagingTypeId,
		priceCents: record.priceCents,
		active: record.active,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
		rawMaterialType: {
			id: record.rawMaterialType.id,
			name: record.rawMaterialType.name,
			unit: record.rawMaterialType.unit,
			active: record.rawMaterialType.active,
		},
		packagingType: {
			id: record.packagingType.id,
			name: record.packagingType.name,
			unit: record.packagingType.unit,
			active: record.packagingType.active,
		},
	};
}
