import { Module, forwardRef } from "@nestjs/common";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { WebsocketModule } from "../websocket/websocket.module";

@Module({
  imports: [forwardRef(() => WebsocketModule)],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
