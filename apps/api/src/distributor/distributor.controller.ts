import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { DistributorService } from "./distributor.service";

@Controller("distributor")
@RequirePermission("distributor.stock.read")
@UseGuards(PolicyGuard)
export class DistributorController {
	constructor(@Inject(DistributorService) private readonly distributorService: DistributorService) {}

	@Get("inventory")
	async inventory() {
		return this.distributorService.getInventory();
	}
}
