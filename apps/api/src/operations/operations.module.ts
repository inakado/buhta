import { Module } from "@nestjs/common";
import { PolicyModule } from "../policy/policy.module";
import { IdempotencyService } from "./idempotency.service";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";
import { OperationService } from "./operation.service";

@Module({
	imports: [PolicyModule],
	controllers: [OperationsController],
	providers: [IdempotencyService, OperationService, OperationsService],
	exports: [IdempotencyService, OperationService],
})
export class OperationsModule {}
