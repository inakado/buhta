import { Module } from "@nestjs/common";
import { PolicyGuard } from "./policy.guard";
import { PolicyRegistry } from "./policy.registry";

@Module({
	providers: [PolicyRegistry, PolicyGuard],
	exports: [PolicyRegistry, PolicyGuard],
})
export class PolicyModule {}
