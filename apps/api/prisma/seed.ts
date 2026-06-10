import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/prisma/client";

const DEFAULT_LOCAL_ADMIN_PASSWORD = "Pass123!";
const seedAdminPassword = resolveSeedAdminPassword();

const seedUsers = [
	{
		id: "seed-admin",
		name: "Admin",
		login: process.env.SEED_ADMIN_LOGIN ?? "admin",
		password: seedAdminPassword,
		role: "admin",
	},
	{
		id: "seed-director",
		name: "Nikita",
		login: "director",
		role: "director",
	},
];

for (const user of seedUsers) {
	const email = `${user.login}@internal.buhta.local`;

	await prisma.user.upsert({
		where: { id: user.id },
		update: {
			email,
			name: user.name,
			username: user.login,
			displayUsername: user.login,
			role: user.role,
		},
		create: {
			id: user.id,
			email,
			username: user.login,
			displayUsername: user.login,
			name: user.name,
			emailVerified: true,
			role: user.role,
		},
	});

	if ("password" in user) {
		const password = await hashPassword(user.password);
		const account = await prisma.account.findFirst({
			where: {
				userId: user.id,
				providerId: "credential",
			},
		});

		if (account) {
			await prisma.account.update({
				where: { id: account.id },
				data: { password },
			});
		} else {
			await prisma.account.create({
				data: {
					id: `${user.id}-credential`,
					accountId: user.id,
					providerId: "credential",
					userId: user.id,
					password,
				},
			});
		}
	}
}

await prisma.$disconnect();

function resolveSeedAdminPassword(): string {
	const explicitPassword = process.env.SEED_ADMIN_PASSWORD;
	const nodeEnv = process.env.NODE_ENV;
	const databaseUrl = process.env.DATABASE_URL;
	const isLocalDev = nodeEnv !== "production" && isLocalDatabaseUrl(databaseUrl);

	if (explicitPassword && (explicitPassword !== DEFAULT_LOCAL_ADMIN_PASSWORD || isLocalDev)) {
		return explicitPassword;
	}

	if (!explicitPassword && isLocalDev) {
		return DEFAULT_LOCAL_ADMIN_PASSWORD;
	}

	throw new Error(
		"SEED_ADMIN_PASSWORD must be set to a non-default value for non-local or production seed runs",
	);
}

function isLocalDatabaseUrl(value: string | undefined): boolean {
	if (!value) {
		return true;
	}

	try {
		const url = new URL(value);
		return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
	} catch {
		return false;
	}
}
