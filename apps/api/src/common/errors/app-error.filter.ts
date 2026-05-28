import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
} from "@nestjs/common";
import { AppError } from "./app-error";
import { appErrorResponse, httpStatusForAppError } from "./http-error.mapper";

type HttpResponse = {
	status: (statusCode: number) => {
		json: (body: unknown) => unknown;
	};
};

@Catch(AppError)
export class AppErrorFilter implements ExceptionFilter {
	catch(error: AppError, host: ArgumentsHost): void {
		const response = host.switchToHttp().getResponse<HttpResponse>();
		const status = httpStatusForAppError(error) ?? HttpStatus.INTERNAL_SERVER_ERROR;
		response.status(status).json(appErrorResponse(error));
	}
}
