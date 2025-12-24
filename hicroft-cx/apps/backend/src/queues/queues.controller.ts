import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Role } from "../common/enums/role.enum";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthUser } from "../common/types/auth-user";
import { CreateQueueDto } from "./dto/create-queue.dto";
import { CreateServiceDto } from "./dto/create-service.dto";
import { QueuesService } from "./queues.service";

@Controller("queues")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueuesController {
  constructor(private readonly queues: QueuesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT)
  async list(@Req() req: Request, @Query("orgId") orgId?: string) {
    const requester = req.user as AuthUser;
    // Frontend expects a raw array.
    return await this.queues.list(requester, orgId);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async create(@Req() req: Request, @Body() dto: CreateQueueDto, @Query("orgId") orgId?: string) {
    const requester = req.user as AuthUser;
    return await this.queues.create(requester, dto.name, orgId);
  }

  @Get(":queueId")
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT)
  async get(@Req() req: Request, @Param("queueId") queueId: string) {
    const requester = req.user as AuthUser;
    return await this.queues.get(requester, queueId);
  }

  @Post(":queueId/services")
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async addService(@Req() req: Request, @Param("queueId") queueId: string, @Body() dto: CreateServiceDto) {
    const requester = req.user as AuthUser;
    return await this.queues.addService(requester, queueId, dto.name);
  }
}
