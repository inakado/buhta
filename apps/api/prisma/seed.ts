import { prisma } from "../src/prisma/client";

const seedUsers = [
	{
		id: "seed-admin",
		name: "Admin",
		email: "admin@buhta.local",
		role: "admin",
	},
	{
		id: "seed-director",
		name: "Nikita",
		email: "director@buhta.local",
		role: "director",
	},
];

for (const user of seedUsers) {
	await prisma.user.upsert({
		where: { email: user.email },
		update: {
			name: user.name,
			role: user.role,
		},
		create: {
			...user,
			emailVerified: true,
		},
	});
}

await prisma.$disconnect();
