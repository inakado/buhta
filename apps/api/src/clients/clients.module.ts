import { Module } from "@nestjs/common";
import { PolicyModule } from "../policy/policy.module";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";

@Module({
	imports: [PolicyModule],
	controllers: [ClientsController],
	providers: [ClientsService],
	exports: [ClientsService],
})
export class ClientsModule {}
