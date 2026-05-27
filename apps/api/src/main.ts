import "reflect-metadata";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const port = Number(process.env.API_PORT ?? 3000);

const app = await NestFactory.create(AppModule, {
	bodyParser: false,
});

app.use(cookieParser());
app.use(helmet());
app.enableCors({
	origin: process.env.WEB_ORIGIN ?? "http://localhost:3001",
	credentials: true,
});

await app.listen(port);
