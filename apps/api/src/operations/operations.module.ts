import { Module } from "@nestjs/common";
import { IdempotencyService } from "./idempotency.service";
import { OperationService } from "./operation.service";

@Module({
	providers: [IdempotencyService, OperationService],
	exports: [IdempotencyService, OperationService],
})
export class OperationsModule {}
