/**
 * Seed script: creates a demo org + default users across roles.
 * Run via: npm run prisma:seed
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

// Keep seed resilient even if Prisma enum types change: store role as string.
const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  AGENT: "AGENT",
} as const;

const prisma = new PrismaClient();

async function main() {
  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 12);

  // Demo org (Organization.name is intentionally NOT unique in the schema,
  // so we avoid upsert-by-name and do a safe find/create.)
  const existingOrg = await prisma.organization.findFirst({
    where: { name: "Hicroft Demo Org" },
  });
  const org =
    existingOrg ??
    (await prisma.organization.create({
      data: { name: "Hicroft Demo Org" },
    }));

  // Super Admin has no org-bound restrictions for org creation.
  await prisma.user.upsert({
    where: { email: "superadmin@hicroft.local" },
    update: {},
    create: {
      email: "superadmin@hicroft.local",
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      passwordHash,
    },
  });

  // Org-scoped users
  const orgUsers = [
    { email: "admin@hicroft.local", name: "Admin", role: Role.ADMIN },
    { email: "manager@hicroft.local", name: "Manager", role: Role.MANAGER },
    { email: "agent@hicroft.local", name: "Agent", role: Role.AGENT },
  ] as const;

  for (const u of orgUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        orgId: org.id,
      },
    });
  }

  console.log("✅ Seed complete.");
  console.log("Default password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
