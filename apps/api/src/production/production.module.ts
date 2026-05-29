import { Module } from "@nestjs/common";
import { PolicyModule } from "../policy/policy.module";
import { ProductionController } from "./production.controller";
import { ProductionService } from "./production.service";

@Module({
	imports: [PolicyModule],
	controllers: [ProductionController],
	providers: [ProductionService],
	exports: [ProductionService],
})
export class ProductionModule {}
