import { z } from "zod";

export const NetWeightGramsSchema = z.number().int().positive();

const PositiveIntegerSchema = z.number().int().positive();
const NetWeightKilogramsSchema = z.union([
	z.number().positive(),
	z.string().trim().min(1),
]);

export const ProductQuantityInputSchema = z.discriminatedUnion("mode", [
	z.object({
		mode: z.literal("net_weight"),
		netWeightKilograms: NetWeightKilogramsSchema,
	}),
	z.object({
		mode: z.literal("units"),
		quantity: PositiveIntegerSchema,
	}),
]);

export type ProductQuantityInput = z.infer<typeof ProductQuantityInputSchema>;

export const ProductQuantityCommandSchema = z.object({
	quantity: PositiveIntegerSchema.optional(),
	quantityInput: ProductQuantityInputSchema.optional(),
}).superRefine((value, context) => {
	if (value.quantity === undefined && value.quantityInput === undefined) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Product quantity is required",
			path: ["quantityInput"],
		});
	}
});
