import { Module } from "@nestjs/common";
import { OperationsModule } from "../operations/operations.module";
import { PolicyModule } from "../policy/policy.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
	imports: [PolicyModule, OperationsModule],
	controllers: [CatalogController],
	providers: [CatalogService],
	exports: [CatalogService],
})
export class CatalogModule {}
