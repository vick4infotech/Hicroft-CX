/**
 * RBAC roles used across the system.
 *
 * IMPORTANT:
 * - We define roles in code (rather than importing from Prisma) so RBAC does not
 *   depend on Prisma codegen. The DB still stores the same string values.
 */
export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  AGENT = "AGENT",
}
