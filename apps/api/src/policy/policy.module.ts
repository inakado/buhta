import { Module } from "@nestjs/common";
import { PolicyRegistry } from "./policy.registry";

@Module({
	providers: [PolicyRegistry],
	exports: [PolicyRegistry],
})
export class PolicyModule {}
