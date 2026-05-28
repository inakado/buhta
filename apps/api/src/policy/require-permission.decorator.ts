import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@buhta/shared";

export const REQUIRED_PERMISSION_METADATA = "buhta:required-permission";

export function RequirePermission(permission: Permission) {
	return SetMetadata(REQUIRED_PERMISSION_METADATA, permission);
}
