import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  UseGuards,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { WsJwtGuard } from "../auth/ws-jwt.guard";

/**
 * TicketGateway (Socket.IO):
 * - Clients connect with cookie-based JWT (access_token)
 * - Clients subscribe to a queue room: `queue:<id>`
 * - Server emits:
 *   - `queue.snapshot` (current + next)
 *   - `ticket.*` events on lifecycle changes
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  },
  path: "/socket.io",
})
export class TicketGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private prisma: PrismaService) {}

  private room(queueId: string) {
    return `queue:${queueId}`;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("subscribe.queue")
  async subscribeQueue(@ConnectedSocket() client: Socket, @MessageBody() body: { queueId: string }) {
    const user = (client as any).data.user;
    const queue = await this.prisma.queue.findUnique({ where: { id: body.queueId } });
    if (!queue || queue.orgId !== user.orgId) {
      client.emit("error", { message: "Forbidden" });
      return;
    }

    await client.join(this.room(body.queueId));
    client.emit("subscribed", { queueId: body.queueId });

    // Immediately send snapshot so HiPlayer/HiQueue have consistent UI.
    const snapshot = await this.buildSnapshot(body.queueId);
    client.emit("queue.snapshot", snapshot);
  }

  /**
   * Snapshot:
   * - current = most recently called/serving ticket
   * - next = top N waiting tickets
   */
  private async buildSnapshot(queueId: string) {
    const current = await this.prisma.ticket.findFirst({
      where: { queueId, status: { in: ["CALLED", "SERVING"] } },
      orderBy: [{ calledAt: "desc" }, { servingAt: "desc" }],
    });

    const next = await this.prisma.ticket.findMany({
      where: { queueId, status: "WAITING" },
      orderBy: { createdAt: "asc" },
      take: 5,
    });

    return { queueId, current, next };
  }

  async emitQueueUpdate(queueId: string) {
    const snapshot = await this.buildSnapshot(queueId);
    this.server.to(this.room(queueId)).emit("queue.snapshot", snapshot);
  }

  async emitTicketEvent(queueId: string, event: string, ticket: any) {
    this.server.to(this.room(queueId)).emit(event, { queueId, ticket });
  }
}
