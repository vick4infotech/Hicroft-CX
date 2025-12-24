import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "../common/enums/role.enum";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CreateOrgDto } from "./dto/create-org.dto";
import { AssignAdminDto } from "./dto/assign-admin.dto";
import { OrgsService } from "./orgs.service";

@Controller("orgs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrgsController {
  constructor(private readonly orgs: OrgsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  async list() {
    return { orgs: await this.orgs.list() };
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() dto: CreateOrgDto) {
    return { org: await this.orgs.create(dto.name) };
  }

  @Post(":orgId/assign-admin")
  @Roles(Role.SUPER_ADMIN)
  async assignAdmin(@Param("orgId") orgId: string, @Body() dto: AssignAdminDto) {
    return { user: await this.orgs.assignAdmin(orgId, dto.userId) };
  }
}
