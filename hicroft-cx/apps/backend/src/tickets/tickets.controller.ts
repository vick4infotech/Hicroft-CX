import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { TicketStatus } from "@prisma/client";
import { Role } from "../common/enums/role.enum";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthUser } from "../common/types/auth-user";
import { TicketsService } from "./tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { CallNextDto } from "./dto/call-next.dto";
import { TransferDto } from "./dto/transfer.dto";

@Controller("tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async create(@Req() req: Request, @Body() dto: CreateTicketDto) {
    const requester = req.user as AuthUser;
    // Frontend expects the created ticket directly.
    return await this.tickets.create(requester, dto.queueId, dto.serviceId);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT)
  async list(@Req() req: Request, @Query("queueId") queueId: string, @Query("status") status?: TicketStatus) {
    const requester = req.user as AuthUser;
    return await this.tickets.list(requester, queueId, status);
  }

  /**
   * Convenience route used by the frontend tickets page.
   */
  @Get("queue/:queueId")
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT)
  async listByQueue(@Req() req: Request, @Param("queueId") queueId: string, @Query("status") status?: TicketStatus) {
    const requester = req.user as AuthUser;
    return await this.tickets.list(requester, queueId, status);
  }

  @Post("call-next")
  @Roles(Role.AGENT)
  async callNext(@Req() req: Request, @Body() dto: CallNextDto) {
    const requester = req.user as AuthUser;
    return await this.tickets.callNext(requester, dto.queueId, dto.counterNumber);
  }

  @Post(":ticketId/recall")
  @Roles(Role.AGENT)
  async recall(@Req() req: Request, @Param("ticketId") ticketId: string) {
    const requester = req.user as AuthUser;
    return await this.tickets.recall(requester, ticketId);
  }

  @Post(":ticketId/serving")
  @Roles(Role.AGENT)
  async serving(@Req() req: Request, @Param("ticketId") ticketId: string) {
    const requester = req.user as AuthUser;
    return await this.tickets.serving(requester, ticketId);
  }

  @Post(":ticketId/complete")
  @Roles(Role.AGENT)
  async complete(@Req() req: Request, @Param("ticketId") ticketId: string) {
    const requester = req.user as AuthUser;
    return await this.tickets.complete(requester, ticketId);
  }

  @Post(":ticketId/no-show")
  @Roles(Role.AGENT)
  async noShow(@Req() req: Request, @Param("ticketId") ticketId: string) {
    const requester = req.user as AuthUser;
    return await this.tickets.noShow(requester, ticketId);
  }

  @Post(":ticketId/transfer")
  @Roles(Role.AGENT, Role.MANAGER)
  async transfer(@Req() req: Request, @Param("ticketId") ticketId: string, @Body() dto: TransferDto) {
    const requester = req.user as AuthUser;
    return await this.tickets.transfer(requester, ticketId, dto.counterNumber);
  }

  @Get("player")
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT)
  async playerState(@Query("queueId") queueId: string) {
    return await this.tickets.getCurrentAndNext(queueId);
  }
}
