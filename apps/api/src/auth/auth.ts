import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";
import { prisma } from "../prisma/client";
import { isValidLogin, normalizeLogin } from "../users/login";

const secret = process.env.BETTER_AUTH_SECRET;
const localDevPlaceholderSecret = "replace-with-at-least-32-random-characters";

if (!secret || secret.length < 32) {
	throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
}

if (process.env.NODE_ENV === "production" && secret === localDevPlaceholderSecret) {
	throw new Error("BETTER_AUTH_SECRET must not use the local development placeholder in production");
}

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
	},
	plugins: [
		username({
			minUsernameLength: 3,
			maxUsernameLength: 30,
			usernameNormalization: normalizeLogin,
			usernameValidator: isValidLogin,
			validationOrder: {
				username: "post-normalization",
			},
		}),
		admin({
			defaultRole: "courier",
			adminRoles: ["admin"],
		}),
	],
	secret,
	trustedOrigins: [
		process.env.WEB_ORIGIN ?? "http://localhost:3001",
		"http://localhost:3001",
		"http://localhost:3003",
	],
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
