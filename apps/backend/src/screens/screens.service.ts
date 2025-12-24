import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types/auth-user";
import { Role } from "../common/enums/role.enum";

function randomCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

@Injectable()
export class ScreensService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceOrgScope(requester: AuthUser, orgId?: string): string {
    if (requester.role === Role.SUPER_ADMIN) {
      if (!orgId) throw new ForbiddenException("orgId required for super admin");
      return orgId;
    }
    if (!requester.orgId) throw new ForbiddenException("Org context required");
    return requester.orgId;
  }

  async list(requester: AuthUser, orgId?: string) {
    const resolvedOrgId = this.enforceOrgScope(requester, orgId);
    return this.prisma.screen.findMany({
      where: { orgId: resolvedOrgId },
      include: { queue: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(requester: AuthUser, name: string, queueId?: string, orgId?: string) {
    const resolvedOrgId = this.enforceOrgScope(requester, orgId);

    // Generate a unique activation code.
    let activationCode = randomCode();
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.screen.findUnique({ where: { activationCode } });
      if (!exists) break;
      activationCode = randomCode();
    }

    if (queueId) {
      const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
      if (!queue) throw new NotFoundException("Queue not found");
      if (queue.orgId !== resolvedOrgId) throw new ForbiddenException("Queue must belong to the same org");
    }

    return this.prisma.screen.create({
      data: { name, orgId: resolvedOrgId, activationCode, queueId: queueId ?? null },
      include: { queue: true },
    });
  }

  async assign(requester: AuthUser, screenId: string, queueId?: string | null) {
    const screen = await this.prisma.screen.findUnique({ where: { id: screenId } });
    if (!screen) throw new NotFoundException("Screen not found");

    if (requester.role !== Role.SUPER_ADMIN) {
      if (!requester.orgId || requester.orgId !== screen.orgId) throw new ForbiddenException("Forbidden");
    }

    if (queueId) {
      const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
      if (!queue) throw new NotFoundException("Queue not found");
      if (queue.orgId !== screen.orgId) throw new ForbiddenException("Queue must belong to the same org");
    }

    return this.prisma.screen.update({
      where: { id: screenId },
      data: { queueId: queueId ?? null },
      include: { queue: true },
    });
  }

  async activate(requester: AuthUser, activationCode: string) {
    // Activation is org-safe: the code uniquely identifies the screen.
    const screen = await this.prisma.screen.findUnique({
      where: { activationCode },
      include: { queue: true },
    });
    if (!screen) throw new NotFoundException("Invalid activation code");

    if (requester.role !== Role.SUPER_ADMIN) {
      if (!requester.orgId || requester.orgId !== screen.orgId) throw new ForbiddenException("Forbidden");
    }

    return screen;
  }
}
