import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { prisma } from "../prisma/client";

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret || secret.length < 32) {
	throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
}

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
	},
	secret,
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
				defaultValue: "courier",
				input: false,
			},
		},
	},
});

export type AuthSession = typeof auth.$Infer.Session;
