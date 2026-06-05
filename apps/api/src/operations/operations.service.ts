import { Injectable } from "@nestjs/common";
import { isRole, ROLES, type OperationHistoryQuery, type OperationHistoryResponse } from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { prisma } from "../prisma/client";
import { BASELINE_OPERATION_TYPES } from "./operation.types";
import { mapOperationHistoryItem } from "./operation-history.mapper";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

type NormalizedHistoryQuery = {
	actorRole?: string;
	actorUserId?: string;
	cursor?: HistoryCursor;
	dateFrom: Date;
	dateTo: Date;
	entityType?: string;
	limit: number;
	operationType?: string;
};

type HistoryCursor = {
	createdAt: Date;
	id: string;
};

@Injectable()
export class OperationsService {
	async getHistory(query: OperationHistoryQuery): Promise<OperationHistoryResponse> {
		const normalized = normalizeHistoryQuery(query);
		const where = buildHistoryWhere(normalized);
		const records = await prisma.auditLog.findMany({
			where,
			include: {
				actor: true,
				operation: true,
			},
			orderBy: [
				{ createdAt: "desc" },
				{ id: "desc" },
			],
			take: normalized.limit + 1,
		});
		const visibleRecords = records.slice(0, normalized.limit);
		const lastVisibleRecord = records.length > normalized.limit
			? visibleRecords[visibleRecords.length - 1]
			: null;

		return {
			items: visibleRecords.map(mapOperationHistoryItem),
			filters: {
				dateFrom: normalized.dateFrom.toISOString(),
				dateTo: normalized.dateTo.toISOString(),
				limit: normalized.limit,
			},
			nextCursor: lastVisibleRecord ? encodeCursor({
				createdAt: lastVisibleRecord.createdAt,
				id: lastVisibleRecord.id,
			}) : null,
		};
	}

	async getHistoryOptions() {
		const [actorUsers, entityTypes] = await Promise.all([
			prisma.user.findMany({
				where: {
					OR: [
						{ operations: { some: {} } },
						{ auditLogs: { some: {} } },
					],
				},
				orderBy: [
					{ role: "asc" },
					{ name: "asc" },
					{ username: "asc" },
				],
				select: {
					id: true,
					username: true,
					displayUsername: true,
					email: true,
					name: true,
					role: true,
				},
			}),
			prisma.auditLog.findMany({
				distinct: ["entityType"],
				orderBy: { entityType: "asc" },
				select: { entityType: true },
			}),
		]);

		return {
			operationTypes: [...BASELINE_OPERATION_TYPES],
			roles: [...ROLES],
			actorUsers: actorUsers.map((user) => ({
				userId: user.id,
				login: user.username ?? user.displayUsername ?? user.email,
				displayName: user.name || user.displayUsername || user.username || user.email,
				role: isRole(user.role) ? user.role : "courier",
			})),
			entityTypes: entityTypes.map((item) => item.entityType),
		};
	}
}

function buildHistoryWhere(query: NormalizedHistoryQuery): Prisma.AuditLogWhereInput {
	const and: Prisma.AuditLogWhereInput[] = [{
		createdAt: {
			gte: query.dateFrom,
			lte: query.dateTo,
		},
	}];

	if (query.cursor) {
		and.push({
			OR: [
				{ createdAt: { lt: query.cursor.createdAt } },
				{
					createdAt: query.cursor.createdAt,
					id: { lt: query.cursor.id },
				},
			],
		});
	}

	if (query.operationType) {
		and.push({
			operation: {
				is: {
					type: query.operationType,
				},
			},
		});
	}

	if (query.actorUserId) {
		and.push({ actorUserId: query.actorUserId });
	}

	if (query.actorRole) {
		and.push({
			actor: {
				is: {
					role: query.actorRole,
				},
			},
		});
	}

	if (query.entityType) {
		and.push({ entityType: query.entityType });
	}

	return { AND: and };
}

function normalizeHistoryQuery(query: OperationHistoryQuery): NormalizedHistoryQuery {
	const now = new Date();
	const dateTo = query.dateTo ? parseDate(query.dateTo, "dateTo") : now;
	const dateFrom = query.dateFrom
		? parseDate(query.dateFrom, "dateFrom")
		: new Date(dateTo.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
	const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

	if (dateTo.getTime() < dateFrom.getTime()) {
		throw new AppError("VALIDATION_ERROR", "dateTo must be after dateFrom");
	}

	if (dateTo.getTime() - dateFrom.getTime() > MAX_RANGE_DAYS * DAY_MS) {
		throw new AppError("VALIDATION_ERROR", "Operation history range cannot exceed 90 days");
	}

	const normalized: NormalizedHistoryQuery = {
		dateFrom,
		dateTo,
		limit,
	};

	if (query.actorRole) {
		normalized.actorRole = query.actorRole;
	}
	if (query.actorUserId) {
		normalized.actorUserId = query.actorUserId;
	}
	if (query.cursor) {
		normalized.cursor = decodeCursor(query.cursor);
	}
	if (query.entityType) {
		normalized.entityType = query.entityType;
	}
	if (query.operationType) {
		normalized.operationType = query.operationType;
	}

	return normalized;
}

function parseDate(value: string, field: string): Date {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		throw new AppError("VALIDATION_ERROR", `Invalid ${field}`);
	}

	return date;
}

function encodeCursor(cursor: HistoryCursor): string {
	return Buffer.from(JSON.stringify({
		createdAt: cursor.createdAt.toISOString(),
		id: cursor.id,
	}), "utf8").toString("base64url");
}

function decodeCursor(value: string): HistoryCursor {
	try {
		const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
			createdAt?: unknown;
			id?: unknown;
		};

		if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
			throw new Error("Invalid cursor shape");
		}

		return {
			createdAt: parseDate(parsed.createdAt, "cursor.createdAt"),
			id: parsed.id,
		};
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		throw new AppError("VALIDATION_ERROR", "Invalid operation history cursor");
	}
}
