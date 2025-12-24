import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { TicketEventType, TicketStatus } from "@prisma/client";
import { Role } from "../common/enums/role.enum";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types/auth-user";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureQueueAccess(requester: AuthUser, queueId: string) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException("Queue not found");

    if (requester.role !== Role.SUPER_ADMIN) {
      if (!requester.orgId || requester.orgId !== queue.orgId) throw new ForbiddenException("Forbidden");
    }

    return queue;
  }

  async overview(requester: AuthUser, queueId: string) {
    await this.ensureQueueAccess(requester, queueId);

    // --- Avg wait time (calledAt - createdAt) ---
    const calledTickets = await this.prisma.ticket.findMany({
      where: { queueId, calledAt: { not: null } },
      select: { createdAt: true, calledAt: true },
    });

    const waitMs = calledTickets
      .map((t) => (t.calledAt ? t.calledAt.getTime() - t.createdAt.getTime() : 0))
      .filter((n) => n > 0);

    const avgWaitMs = waitMs.length > 0 ? Math.round(waitMs.reduce((a, b) => a + b, 0) / waitMs.length) : 0;
    const avgWaitSec = Math.round(avgWaitMs / 1000);

    const servedByAgent = await this.prisma.ticket.groupBy({
      by: ["agentId"],
      where: { queueId, status: TicketStatus.COMPLETED, agentId: { not: null } },
      _count: { _all: true },
    });

    const agentIds = servedByAgent.map((r) => r.agentId).filter(Boolean) as string[];
    const agents = agentIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, email: true } })
      : [];

    // UI expects { agentId, agentName, count }
    const servedPerAgent = servedByAgent.map((row) => {
      const agent = agents.find((a) => a.id === row.agentId);
      return {
        agentId: row.agentId,
        agentName: agent?.name ?? agent?.email ?? "Unknown",
        count: row._count._all,
      };
    });

    // --- Peak hours (simple aggregation): CALLED events in the last 7 days ---
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const calledEvents = await this.prisma.ticketEvent.findMany({
      where: { queueId, type: TicketEventType.CALLED, createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const byHour: Record<number, number> = {};
    for (const e of calledEvents) {
      const h = e.createdAt.getHours();
      byHour[h] = (byHour[h] ?? 0) + 1;
    }

    const peakHours = Object.keys(byHour)
      .map((k) => ({ hour: Number(k), count: byHour[Number(k)] }))
      .sort((a, b) => a.hour - b.hour);

    return {
      avgWaitMs,
      avgWaitSec,
      servedPerAgent,
      peakHours,
    };
  }
}
