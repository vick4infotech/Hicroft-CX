import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Role } from "../common/enums/role.enum";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { AuthUser } from "../common/types/auth-user";

/**
 * Users endpoints (RBAC enforced).
 */
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async list(@Req() req: Request, @Query("orgId") orgId?: string) {
    const requester = req.user as AuthUser;
    return { users: await this.users.list(requester, orgId) };
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async create(@Req() req: Request, @Body() dto: CreateUserDto) {
    const requester = req.user as AuthUser;
    return { user: await this.users.create(requester, dto) };
  }
}
