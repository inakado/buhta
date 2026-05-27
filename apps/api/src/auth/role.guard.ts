import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

type RequestWithUser = {
	user?: {
		role?: string | null;
	};
};

@Injectable()
export class DirectorOnlyGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<RequestWithUser>();
		return request.user?.role === "director" || request.user?.role === "admin";
	}
}
