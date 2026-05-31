import { Module } from "@nestjs/common";
import { PolicyModule } from "../policy/policy.module";
import { CourierController } from "./courier.controller";
import { CourierService } from "./courier.service";

@Module({
	imports: [PolicyModule],
	controllers: [CourierController],
	providers: [CourierService],
	exports: [CourierService],
})
export class CourierModule {}
