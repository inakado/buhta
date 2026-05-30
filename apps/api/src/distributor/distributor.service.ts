import { Injectable } from "@nestjs/common";
import type { DistributorInventoryResponse } from "@buhta/shared";
import { prisma } from "../prisma/client";
import {
	mapDistributorInventoryItem,
	summarizeDistributorInventory,
} from "./distributor.mapper";

@Injectable()
export class DistributorService {
	async getInventory(): Promise<DistributorInventoryResponse> {
		const balances = await prisma.distributorProductBalance.findMany({
			where: { quantity: { gt: 0 } },
			include: {
				distributor: true,
				productBatch: true,
			},
			orderBy: [
				{ distributor: { name: "asc" } },
				{ productBatch: { productName: "asc" } },
				{ updatedAt: "desc" },
			],
		});
		const items = balances.map(mapDistributorInventoryItem);
		const { summary, distributorSummaries } = summarizeDistributorInventory(items);

		return {
			summary,
			distributorSummaries,
			items,
		};
	}
}
