import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? "postgresql://buhta:buhta@localhost:5433/buhta";

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
