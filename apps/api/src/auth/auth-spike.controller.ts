import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { DirectorOnlyGuard } from "./role.guard";

type RequestWithUser = {
	user?: {
		id?: string;
		email?: string;
		role?: string | null;
	};
};

@Controller("auth-spike")
export class AuthSpikeController {
	@Get("director-only")
	@UseGuards(DirectorOnlyGuard)
	directorOnly(@Req() request: RequestWithUser) {
		return {
			status: "ok",
			userId: request.user?.id,
			role: request.user?.role,
		};
	}
}
