import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { AuthSpikeController } from "./auth/auth-spike.controller";
import { AuthMeController } from "./auth/auth-me.controller";
import { AnalyticsModule } from "./analytics/analytics.module";
import { auth } from "./auth/auth";
import { CatalogModule } from "./catalog/catalog.module";
import { ClientsModule } from "./clients/clients.module";
import { AppErrorFilter } from "./common/errors/app-error.filter";
import { CourierModule } from "./courier/courier.module";
import { DistributorModule } from "./distributor/distributor.module";
import { HealthController } from "./health/health.controller";
import { NotificationsModule } from "./notifications/notifications.module";
import { OperationsModule } from "./operations/operations.module";
import { PolicyModule } from "./policy/policy.module";
import { ProductionModule } from "./production/production.module";
import { UsersModule } from "./users/users.module";

@Module({
	imports: [
		AuthModule.forRoot({
			auth,
			bodyParser: {
				json: { limit: "2mb" },
				urlencoded: { limit: "2mb", extended: true },
			},
		}),
		PolicyModule,
		AnalyticsModule,
		OperationsModule,
		UsersModule,
		CatalogModule,
		ClientsModule,
		ProductionModule,
		DistributorModule,
		CourierModule,
		NotificationsModule,
	],
	controllers: [HealthController, AuthMeController, AuthSpikeController],
	providers: [
		{
			provide: APP_FILTER,
			useClass: AppErrorFilter,
		},
	],
})
export class AppModule {}
