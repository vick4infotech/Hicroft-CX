import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types/auth-user";
import { TicketStatus, TicketEventType } from "@prisma/client";
import { Role } from "../common/enums/role.enum";
import { TicketGateway } from "../websocket/ticket.gateway";

/**
 * TicketsService implements the ticket lifecycle and emits real-time events.
 */
@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService, private readonly ws: TicketGateway) {}

  private async getQueueForUser(requester: AuthUser, queueId: string) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException("Queue not found");

    if (requester.role !== Role.SUPER_ADMIN) {
      if (!requester.orgId || requester.orgId !== queue.orgId) throw new ForbiddenException("Forbidden");
    }

    return queue;
  }

  private async createEvent(args: {
    ticketId: string;
    queueId: string;
    type: TicketEventType;
    actorId?: string;
    meta?: any;
  }) {
    return this.prisma.ticketEvent.create({
      data: {
        ticketId: args.ticketId,
        queueId: args.queueId,
        type: args.type,
        actorId: args.actorId,
        meta: args.meta,
      },
    });
  }

  async create(requester: AuthUser, queueId: string, serviceId?: string) {
    await this.getQueueForUser(requester, queueId);

    // Transaction: reserve nextNumber and create ticket.
    const ticket = await this.prisma.$transaction(async (tx) => {
      const q = await tx.queue.update({
        where: { id: queueId },
        data: { nextNumber: { increment: 1 } },
        select: { nextNumber: true },
      });

      const number = q.nextNumber - 1;

      return tx.ticket.create({
        data: {
          queueId,
          serviceId: serviceId ?? null,
          number,
          status: TicketStatus.WAITING,
        },
        include: { queue: true, service: true },
      });
    });

    await this.createEvent({ ticketId: ticket.id, queueId: ticket.queueId, type: TicketEventType.CREATED, actorId: requester.id });

    await this.ws.emitQueueUpdate(ticket.queueId);
    return ticket;
  }

  async list(requester: AuthUser, queueId: string, status?: TicketStatus) {
    await this.getQueueForUser(requester, queueId);

    return this.prisma.ticket.findMany({
      where: {
        queueId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async callNext(requester: AuthUser, queueId: string, counterNumber?: string) {
    await this.getQueueForUser(requester, queueId);

    // pick earliest WAITING ticket
    const next = await this.prisma.ticket.findFirst({
      where: { queueId, status: TicketStatus.WAITING },
      orderBy: { createdAt: "asc" },
    });
    if (!next) throw new BadRequestException("No waiting tickets");

    const updated = await this.prisma.ticket.update({
      where: { id: next.id },
      data: {
        status: TicketStatus.CALLED,
        calledAt: new Date(),
        counterNumber: counterNumber ?? next.counterNumber,
        agentId: requester.id,
      },
    });

    await this.createEvent({
      ticketId: updated.id,
      queueId: updated.queueId,
      type: TicketEventType.CALLED,
      actorId: requester.id,
      meta: { counterNumber: updated.counterNumber ?? null },
    });

    await this.ws.emitQueueUpdate(updated.queueId);
    await this.ws.emitTicketEvent(updated.queueId, "ticket.called", updated);
    return updated;
  }

  async recall(requester: AuthUser, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    await this.getQueueForUser(requester, ticket.queueId);

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CALLED, calledAt: ticket.calledAt ?? new Date(), agentId: requester.id },
    });

    await this.createEvent({ ticketId, queueId: ticket.queueId, type: TicketEventType.RECALLED, actorId: requester.id });
    await this.ws.emitQueueUpdate(ticket.queueId);
    await this.ws.emitTicketEvent(ticket.queueId, "ticket.called", updated);
    return updated;
  }

  async serving(requester: AuthUser, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    await this.getQueueForUser(requester, ticket.queueId);

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.SERVING, servingAt: new Date(), agentId: requester.id },
    });

    await this.createEvent({ ticketId, queueId: ticket.queueId, type: TicketEventType.SERVING, actorId: requester.id });
    await this.ws.emitQueueUpdate(ticket.queueId);
    await this.ws.emitTicketEvent(ticket.queueId, "ticket.serving", updated);
    return updated;
  }

  async complete(requester: AuthUser, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    await this.getQueueForUser(requester, ticket.queueId);

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.COMPLETED, completedAt: new Date(), agentId: requester.id },
    });

    await this.createEvent({ ticketId, queueId: ticket.queueId, type: TicketEventType.COMPLETED, actorId: requester.id });
    await this.ws.emitQueueUpdate(ticket.queueId);
    await this.ws.emitTicketEvent(ticket.queueId, "ticket.completed", updated);
    return updated;
  }

  async noShow(requester: AuthUser, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    await this.getQueueForUser(requester, ticket.queueId);

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.NO_SHOW, completedAt: new Date(), agentId: requester.id },
    });

    await this.createEvent({ ticketId, queueId: ticket.queueId, type: TicketEventType.NO_SHOW, actorId: requester.id });
    await this.ws.emitQueueUpdate(ticket.queueId);
    await this.ws.emitTicketEvent(ticket.queueId, "ticket.no_show", updated);
    return updated;
  }

  async transfer(requester: AuthUser, ticketId: string, counterNumber?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    await this.getQueueForUser(requester, ticket.queueId);

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { counterNumber: counterNumber ?? null },
    });

    await this.createEvent({
      ticketId,
      queueId: ticket.queueId,
      type: TicketEventType.TRANSFERRED,
      actorId: requester.id,
      meta: { counterNumber: counterNumber ?? null },
    });

    await this.ws.emitQueueUpdate(ticket.queueId);
    return updated;
  }

  async getCurrentAndNext(queueId: string) {
    // Used by HiPlayer/HiData.
    const current = await this.prisma.ticket.findFirst({
      where: { queueId, status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
      orderBy: { calledAt: "desc" },
    });

    const next = await this.prisma.ticket.findMany({
      where: { queueId, status: TicketStatus.WAITING },
      orderBy: { createdAt: "asc" },
      take: 5,
    });

    return { current, next };
  }
}
