import { Module } from "@nestjs/common";
import { PolicyModule } from "../policy/policy.module";
import { DirectAccountingController } from "./direct-accounting.controller";
import { DirectAccountingService } from "./direct-accounting.service";

@Module({
	imports: [PolicyModule],
	controllers: [DirectAccountingController],
	providers: [DirectAccountingService],
})
export class DirectAccountingModule {}
