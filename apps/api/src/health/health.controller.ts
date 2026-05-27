import { Controller, Get } from "@nestjs/common";
import { HEALTH_RESPONSE_SCHEMA_VERSION, HEALTH_RESPONSE_STATUS } from "@buhta/shared";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

@AllowAnonymous()
@Controller()
export class HealthController {
	@Get("health")
	health() {
		return {
			status: HEALTH_RESPONSE_STATUS,
			schemaVersion: HEALTH_RESPONSE_SCHEMA_VERSION,
		};
	}
}
