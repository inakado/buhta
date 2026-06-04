import { z } from "zod";
import {
	DistributorSchema,
	PackagingTypeSchema,
	ProductTemplateSchema,
	RawMaterialTypeSchema,
} from "./catalog";

const QuantityValueSchema = z.number().positive();
const PositiveIntegerSchema = z.number().int().positive();
const OptionalCommentSchema = z.string().trim().max(500).optional();

export const ProductionBalanceItemSchema = z.object({
	id: z.string(),
	typeId: z.string(),
	name: z.string(),
	unit: z.string(),
	quantity: z.number().nonnegative(),
	updatedAt: z.string(),
});

export type ProductionBalanceItem = z.infer<typeof ProductionBalanceItemSchema>;

export const ProductionSummarySchema = z.object({
	readyProductUnits: z.number().int().nonnegative(),
	rawMaterialKinds: z.number().int().nonnegative(),
	rawMaterialTotal: z.number().nonnegative(),
	rawMaterialUnit: z.string(),
	packagingKinds: z.number().int().nonnegative(),
	packagingTotal: z.number().nonnegative(),
	packagingUnit: z.string(),
});

export type ProductionSummary = z.infer<typeof ProductionSummarySchema>;

export const ProductionSummaryResponseSchema = z.object({
	summary: ProductionSummarySchema,
});

export type ProductionSummaryResponse = z.infer<typeof ProductionSummaryResponseSchema>;

export const ProductionOptionsResponseSchema = z.object({
	rawMaterialTypes: z.array(RawMaterialTypeSchema),
	packagingTypes: z.array(PackagingTypeSchema),
	productTemplates: z.array(ProductTemplateSchema),
});

export type ProductionOptionsResponse = z.infer<typeof ProductionOptionsResponseSchema>;

export const RawMaterialBalancesResponseSchema = z.object({
	rawMaterialBalances: z.array(ProductionBalanceItemSchema),
});

export type RawMaterialBalancesResponse = z.infer<typeof RawMaterialBalancesResponseSchema>;

export const PackagingBalancesResponseSchema = z.object({
	packagingBalances: z.array(ProductionBalanceItemSchema),
});

export type PackagingBalancesResponse = z.infer<typeof PackagingBalancesResponseSchema>;

export const CreateRawMaterialIntakeRequestSchema = z.object({
	rawMaterialTypeId: z.string().min(1),
	quantity: QuantityValueSchema,
	comment: OptionalCommentSchema,
});

export type CreateRawMaterialIntakeRequest = z.infer<typeof CreateRawMaterialIntakeRequestSchema>;

export const CreatePackagingIntakeRequestSchema = z.object({
	packagingTypeId: z.string().min(1),
	quantity: QuantityValueSchema,
	comment: OptionalCommentSchema,
});

export type CreatePackagingIntakeRequest = z.infer<typeof CreatePackagingIntakeRequestSchema>;

export const ProductBatchStatusSchema = z.enum(["in_workshop"]);

export type ProductBatchStatus = z.infer<typeof ProductBatchStatusSchema>;

export const ProductBatchSchema = z.object({
	id: z.string(),
	productTemplateId: z.string(),
	productName: z.string(),
	rawMaterialTypeId: z.string(),
	rawMaterialTypeName: z.string(),
	rawMaterialUnit: z.string(),
	packagingTypeId: z.string(),
	packagingTypeName: z.string(),
	packagingUnit: z.string(),
	priceCents: z.number().int().nonnegative(),
	quantity: z.number().int().positive(),
	consumedRawMaterialQuantity: z.number().positive(),
	consumedPackagingQuantity: z.number().positive(),
	status: ProductBatchStatusSchema,
	createdAt: z.string(),
});

export type ProductBatch = z.infer<typeof ProductBatchSchema>;

export const ProductBatchesResponseSchema = z.object({
	productBatches: z.array(ProductBatchSchema),
});

export type ProductBatchesResponse = z.infer<typeof ProductBatchesResponseSchema>;

export const WorkshopProductBalanceItemSchema = z.object({
	id: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	priceCents: z.number().int().nonnegative(),
	quantity: z.number().int().nonnegative(),
	producedQuantity: z.number().int().positive(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type WorkshopProductBalanceItem = z.infer<typeof WorkshopProductBalanceItemSchema>;

export const DistributorProductBalanceItemSchema = z.object({
	id: z.string(),
	distributorId: z.string(),
	distributorName: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	baseUnitPriceCents: z.number().int().nonnegative(),
	unitPriceCents: z.number().int().nonnegative(),
	discounted: z.boolean(),
	discountCentsPerUnit: z.number().int().nonnegative(),
	quantity: z.number().int().nonnegative(),
	stockValueCents: z.number().int().nonnegative(),
	updatedAt: z.string(),
});

export type DistributorProductBalanceItem = z.infer<typeof DistributorProductBalanceItemSchema>;

export const WorkshopProductBalancesResponseSchema = z.object({
	workshopProductBalances: z.array(WorkshopProductBalanceItemSchema),
});

export type WorkshopProductBalancesResponse = z.infer<typeof WorkshopProductBalancesResponseSchema>;

export const ProductionTransferOptionsResponseSchema = z.object({
	distributors: z.array(DistributorSchema),
	workshopProductBalances: z.array(WorkshopProductBalanceItemSchema),
});

export type ProductionTransferOptionsResponse = z.infer<typeof ProductionTransferOptionsResponseSchema>;

export const CreateProductTransferRequestSchema = z.object({
	productBatchId: z.string().min(1),
	distributorId: z.string().min(1),
	quantity: PositiveIntegerSchema,
	comment: OptionalCommentSchema,
});

export type CreateProductTransferRequest = z.infer<typeof CreateProductTransferRequestSchema>;

export const ProductTransferSchema = z.object({
	id: z.string(),
	productBatchId: z.string(),
	distributorId: z.string(),
	quantity: z.number().int().positive(),
	baseUnitPriceCents: z.number().int().positive(),
	unitPriceCents: z.number().int().positive(),
	discountCentsPerUnit: z.number().int().nonnegative(),
	stockValueCents: z.number().int().nonnegative(),
	comment: z.string().nullable(),
	operationId: z.string(),
	actorUserId: z.string(),
	createdAt: z.string(),
});

export type ProductTransfer = z.infer<typeof ProductTransferSchema>;

export const ProductTransferResponseSchema = z.object({
	transfer: ProductTransferSchema,
	workshopProductBalance: WorkshopProductBalanceItemSchema,
	distributorProductBalance: DistributorProductBalanceItemSchema,
});

export type ProductTransferResponse = z.infer<typeof ProductTransferResponseSchema>;

export const CreateProductBatchRequestSchema = z.object({
	productTemplateId: z.string().min(1),
	quantity: PositiveIntegerSchema,
	consumedRawMaterialQuantity: QuantityValueSchema,
	comment: OptionalCommentSchema,
});

export type CreateProductBatchRequest = z.infer<typeof CreateProductBatchRequestSchema>;

export const RawMaterialIntakeResponseSchema = z.object({
	rawMaterialBalance: ProductionBalanceItemSchema,
});

export type RawMaterialIntakeResponse = z.infer<typeof RawMaterialIntakeResponseSchema>;

export const PackagingIntakeResponseSchema = z.object({
	packagingBalance: ProductionBalanceItemSchema,
});

export type PackagingIntakeResponse = z.infer<typeof PackagingIntakeResponseSchema>;

export const ProductBatchResponseSchema = z.object({
	productBatch: ProductBatchSchema,
});

export type ProductBatchResponse = z.infer<typeof ProductBatchResponseSchema>;
