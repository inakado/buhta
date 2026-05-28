import type { Role } from "@buhta/shared";

export const ROLE_LABELS: Record<Role, string> = {
	admin: "Администратор",
	director: "Директор",
	production_manager: "Заведующий производством",
	commercial_manager: "Коммерческий руководитель",
	distributor_worker: "Работник распределителя",
	courier: "Курьер",
};
