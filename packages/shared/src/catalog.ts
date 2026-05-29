import { z } from "zod";

const NameSchema = z.string().trim().min(1).max(120);
const UnitSchema = z.string().trim().min(1).max(40);

export const CatalogEntitySchema = z.object({
	id: z.string(),
	name: NameSchema,
	active: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const RawMaterialTypeSchema = CatalogEntitySchema.extend({
	unit: UnitSchema,
});

export type RawMaterialType = z.infer<typeof RawMaterialTypeSchema>;

export const PackagingTypeSchema = CatalogEntitySchema.extend({
	unit: UnitSchema,
});

export type PackagingType = z.infer<typeof PackagingTypeSchema>;

export const DistributorSchema = CatalogEntitySchema;

export type Distributor = z.infer<typeof DistributorSchema>;

export const ProductTemplateSchema = CatalogEntitySchema.extend({
	rawMaterialTypeId: z.string().min(1),
	packagingTypeId: z.string().min(1),
	rawMaterialType: RawMaterialTypeSchema.pick({
		id: true,
		name: true,
		unit: true,
		active: true,
	}),
	packagingType: PackagingTypeSchema.pick({
		id: true,
		name: true,
		unit: true,
		active: true,
	}),
});

export type ProductTemplate = z.infer<typeof ProductTemplateSchema>;

export const CreateRawMaterialTypeRequestSchema = z.object({
	name: NameSchema,
	unit: UnitSchema,
});

export type CreateRawMaterialTypeRequest = z.infer<typeof CreateRawMaterialTypeRequestSchema>;

export const UpdateRawMaterialTypeRequestSchema = CreateRawMaterialTypeRequestSchema.partial().extend({
	active: z.boolean().optional(),
});

export type UpdateRawMaterialTypeRequest = z.infer<typeof UpdateRawMaterialTypeRequestSchema>;

export const RawMaterialTypesListResponseSchema = z.object({
	rawMaterialTypes: z.array(RawMaterialTypeSchema),
});

export type RawMaterialTypesListResponse = z.infer<typeof RawMaterialTypesListResponseSchema>;

export const RawMaterialTypeResponseSchema = z.object({
	rawMaterialType: RawMaterialTypeSchema,
});

export type RawMaterialTypeResponse = z.infer<typeof RawMaterialTypeResponseSchema>;

export const CreatePackagingTypeRequestSchema = z.object({
	name: NameSchema,
	unit: UnitSchema,
});

export type CreatePackagingTypeRequest = z.infer<typeof CreatePackagingTypeRequestSchema>;

export const UpdatePackagingTypeRequestSchema = CreatePackagingTypeRequestSchema.partial().extend({
	active: z.boolean().optional(),
});

export type UpdatePackagingTypeRequest = z.infer<typeof UpdatePackagingTypeRequestSchema>;

export const PackagingTypesListResponseSchema = z.object({
	packagingTypes: z.array(PackagingTypeSchema),
});

export type PackagingTypesListResponse = z.infer<typeof PackagingTypesListResponseSchema>;

export const PackagingTypeResponseSchema = z.object({
	packagingType: PackagingTypeSchema,
});

export type PackagingTypeResponse = z.infer<typeof PackagingTypeResponseSchema>;

export const CreateDistributorRequestSchema = z.object({
	name: NameSchema,
});

export type CreateDistributorRequest = z.infer<typeof CreateDistributorRequestSchema>;

export const UpdateDistributorRequestSchema = CreateDistributorRequestSchema.partial().extend({
	active: z.boolean().optional(),
});

export type UpdateDistributorRequest = z.infer<typeof UpdateDistributorRequestSchema>;

export const DistributorsListResponseSchema = z.object({
	distributors: z.array(DistributorSchema),
});

export type DistributorsListResponse = z.infer<typeof DistributorsListResponseSchema>;

export const DistributorResponseSchema = z.object({
	distributor: DistributorSchema,
});

export type DistributorResponse = z.infer<typeof DistributorResponseSchema>;

export const CreateProductTemplateRequestSchema = z.object({
	name: NameSchema,
	rawMaterialTypeId: z.string().min(1),
	packagingTypeId: z.string().min(1),
});

export type CreateProductTemplateRequest = z.infer<typeof CreateProductTemplateRequestSchema>;

export const UpdateProductTemplateRequestSchema = CreateProductTemplateRequestSchema.partial().extend({
	active: z.boolean().optional(),
});

export type UpdateProductTemplateRequest = z.infer<typeof UpdateProductTemplateRequestSchema>;

export const ProductTemplatesListResponseSchema = z.object({
	productTemplates: z.array(ProductTemplateSchema),
});

export type ProductTemplatesListResponse = z.infer<typeof ProductTemplatesListResponseSchema>;

export const ProductTemplateResponseSchema = z.object({
	productTemplate: ProductTemplateSchema,
});

export type ProductTemplateResponse = z.infer<typeof ProductTemplateResponseSchema>;
