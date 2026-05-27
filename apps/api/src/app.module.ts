import { Module } from "@nestjs/common";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { AuthSpikeController } from "./auth/auth-spike.controller";
import { auth } from "./auth/auth";
import { HealthController } from "./health/health.controller";

@Module({
	imports: [
		AuthModule.forRoot({
			auth,
			bodyParser: {
				json: { limit: "2mb" },
				urlencoded: { limit: "2mb", extended: true },
			},
		}),
	],
	controllers: [HealthController, AuthSpikeController],
})
export class AppModule {}
