import { Role } from "../enums/role.enum";

/**
 * Minimal user payload we attach to req.user.
 */
export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  orgId: string | null;
  name: string;
};
