import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types/auth-user";
import { Role } from "../common/enums/role.enum";

/**
 * QueuesService handles queue and service configuration.
 */
@Injectable()
export class QueuesService {
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
    return this.prisma.queue.findMany({
      where: { orgId: resolvedOrgId },
      include: { services: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(requester: AuthUser, name: string, orgId?: string) {
    const resolvedOrgId = this.enforceOrgScope(requester, orgId);
    return this.prisma.queue.create({
      data: { name, orgId: resolvedOrgId },
    });
  }

  async addService(requester: AuthUser, queueId: string, name: string) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException("Queue not found");

    if (requester.role !== Role.SUPER_ADMIN) {
      if (!requester.orgId || requester.orgId !== queue.orgId) throw new ForbiddenException("Forbidden");
    }

    return this.prisma.service.create({
      data: { queueId: queue.id, name },
    });
  }

  async get(requester: AuthUser, queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { services: true },
    });
    if (!queue) throw new NotFoundException("Queue not found");

    if (requester.role !== Role.SUPER_ADMIN) {
      if (!requester.orgId || requester.orgId !== queue.orgId) throw new ForbiddenException("Forbidden");
    }

    return queue;
  }
}
