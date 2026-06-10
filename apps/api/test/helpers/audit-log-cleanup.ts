import type { Prisma } from "../../src/generated/prisma/client";
import { prisma } from "../../src/prisma/client";

export async function deleteAuditLogsForTest(args: Prisma.AuditLogDeleteManyArgs): Promise<void> {
	await prisma.$transaction(async (tx) => {
		await tx.$executeRawUnsafe("SET LOCAL buhta.allow_audit_log_mutation = 'on'");
		await tx.auditLog.deleteMany(args);
	});
}
