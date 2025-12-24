import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Role } from "../common/enums/role.enum";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthUser } from "../common/types/auth-user";
import { CreateScreenDto } from "./dto/create-screen.dto";
import { AssignScreenDto } from "./dto/assign-screen.dto";
import { ActivateScreenDto } from "./dto/activate-screen.dto";
import { ScreensService } from "./screens.service";

@Controller("screens")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScreensController {
  constructor(private readonly screens: ScreensService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async list(@Req() req: Request, @Query("orgId") orgId?: string) {
    const requester = req.user as AuthUser;
    return { screens: await this.screens.list(requester, orgId) };
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async create(@Req() req: Request, @Body() dto: CreateScreenDto, @Query("orgId") orgId?: string) {
    const requester = req.user as AuthUser;
    return { screen: await this.screens.create(requester, dto.name, dto.queueId, orgId) };
  }

  @Patch(":screenId")
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async assign(@Req() req: Request, @Param("screenId") screenId: string, @Body() dto: AssignScreenDto) {
    const requester = req.user as AuthUser;
    return { screen: await this.screens.assign(requester, screenId, dto.queueId ?? null) };
  }

  @Post("activate")
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT)
  async activate(@Req() req: Request, @Body() dto: ActivateScreenDto) {
    const requester = req.user as AuthUser;
    return { screen: await this.screens.activate(requester, dto.activationCode) };
  }
}
