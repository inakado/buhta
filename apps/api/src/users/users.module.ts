import { Module } from "@nestjs/common";
import { OperationsModule } from "../operations/operations.module";
import { PolicyModule } from "../policy/policy.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
	imports: [PolicyModule, OperationsModule],
	controllers: [UsersController],
	providers: [UsersService],
	exports: [UsersService],
})
export class UsersModule {}
