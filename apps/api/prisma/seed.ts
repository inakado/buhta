import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/prisma/client";

const seedUsers = [
	{
		id: "seed-admin",
		name: "Admin",
		login: process.env.SEED_ADMIN_LOGIN ?? "admin",
		password: process.env.SEED_ADMIN_PASSWORD ?? "Pass123!",
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
