import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "../common/enums/role.enum";

type SocketUser = {
  id: string;
  email: string;
  role: Role;
  orgId: string | null;
};

function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = decodeURIComponent(pair.slice(idx + 1).trim());
    out[key] = value;
  }
  return out;
}

/**
 * Socket.IO gateway with JWT auth (via httpOnly cookie).
 *
 * Clients should:
 * - connect with credentials
 * - emit joinQueue { queueId }
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: "/ws",
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookies = parseCookieHeader(client.handshake.headers.cookie as string | undefined);
      const token = cookies["hicroft_access"];
      if (!token) return client.disconnect(true);

      const payload = await this.jwt.verifyAsync<any>(token, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET") ?? "change-me-access",
      });

      const user: SocketUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        orgId: payload.orgId ?? null,
      };

      (client.data as any).user = user;
      client.emit("connected", { ok: true });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op
  }

  @SubscribeMessage("joinQueue")
  async joinQueue(@ConnectedSocket() client: Socket, @MessageBody() body: { queueId: string }) {
    const user = (client.data as any).user as SocketUser | undefined;
    if (!user) return { ok: false };

    const queue = await this.prisma.queue.findUnique({ where: { id: body.queueId } });
    if (!queue) return { ok: false };

    if (user.role !== Role.SUPER_ADMIN) {
      if (!user.orgId || user.orgId !== queue.orgId) return { ok: false };
    }

    await client.join(this.roomForQueue(body.queueId));
    return { ok: true };
  }

  roomForQueue(queueId: string) {
    return `queue:${queueId}`;
  }

  /**
   * Server-side convenience: emit events scoped to a queue room.
   */
  emitToQueue(queueId: string, event: string, data: unknown) {
    this.server.to(this.roomForQueue(queueId)).emit(event, data);
  }
}
