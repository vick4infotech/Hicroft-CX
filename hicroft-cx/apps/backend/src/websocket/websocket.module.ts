import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TicketGateway } from "./ticket.gateway";
import { WsJwtGuard } from "../auth/ws-jwt.guard";

/**
 * WebsocketModule:
 * - TicketGateway powers realtime updates (HiQueue/HiPlayer/HiData)
 * - WsJwtGuard authorizes socket connections using the same JWT cookie as HTTP
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [TicketGateway, WsJwtGuard],
  exports: [TicketGateway],
})
export class WebsocketModule {}
