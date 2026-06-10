import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? "postgresql://buhta:buhta@localhost:5433/buhta";

if (process.env.NODE_ENV === "production" && usesLocalDefaultDatabaseCredentials(connectionString)) {
	throw new Error("DATABASE_URL must not use local default buhta/buhta credentials in production");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

function usesLocalDefaultDatabaseCredentials(value: string): boolean {
	try {
		const url = new URL(value);
		return url.username === "buhta" && url.password === "buhta";
	} catch {
		return false;
	}
}
