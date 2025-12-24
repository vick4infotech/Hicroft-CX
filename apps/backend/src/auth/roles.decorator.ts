import { SetMetadata } from "@nestjs/common";
import { Role } from "../common/enums/role.enum";

/**
 * Roles decorator used by RolesGuard.
 * Example: @Roles(Role.ADMIN, Role.MANAGER)
 */
export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
