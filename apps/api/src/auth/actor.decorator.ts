import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Actor, RequestWithActor } from "../policy/actor";

export const CurrentActor = createParamDecorator(
	(_data: unknown, context: ExecutionContext): Actor | undefined => {
		const request = context.switchToHttp().getRequest<RequestWithActor>();
		return request.actor;
	},
);
