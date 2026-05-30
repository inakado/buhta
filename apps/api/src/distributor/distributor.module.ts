import { Module } from "@nestjs/common";
import { PolicyModule } from "../policy/policy.module";
import { DistributorController } from "./distributor.controller";
import { DistributorService } from "./distributor.service";

@Module({
	imports: [PolicyModule],
	controllers: [DistributorController],
	providers: [DistributorService],
	exports: [DistributorService],
})
export class DistributorModule {}
