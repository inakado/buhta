import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Permission } from "@buhta/shared";
import type { RequestWithActor } from "./actor";
import { REQUIRED_PERMISSION_METADATA } from "./require-permission.decorator";
import { PolicyRegistry } from "./policy.registry";

@Injectable()
export class PolicyGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly policyRegistry: PolicyRegistry,
	) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredPermission = this.reflector.getAllAndOverride<Permission | undefined>(
			REQUIRED_PERMISSION_METADATA,
			[context.getHandler(), context.getClass()],
		);

		if (!requiredPermission) {
			return true;
		}

		const request = context.switchToHttp().getRequest<RequestWithActor>();
		const actor = request.user ? this.policyRegistry.buildActor(request.user) : null;

		if (!actor) {
			throw new UnauthorizedException({
				error: {
					code: "UNAUTHENTICATED",
					message: "Authentication is required",
				},
			});
		}

		request.actor = actor;

		if (!this.policyRegistry.hasPermission(actor, requiredPermission)) {
			throw new ForbiddenException({
				error: {
					code: "FORBIDDEN",
					message: "Permission denied",
					details: { permission: requiredPermission },
				},
			});
		}

		return true;
	}
}
