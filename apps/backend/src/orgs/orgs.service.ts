import { BadRequestException, Injectable } from "@nestjs/common";
import { Role } from "../common/enums/role.enum";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.organization.findMany({ orderBy: { createdAt: "asc" } });
  }

  async create(name: string) {
    return this.prisma.organization.create({ data: { name } });
  }

  async assignAdmin(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");

    return this.prisma.user.update({
      where: { id: userId },
      data: { orgId, role: Role.ADMIN },
    });
  }
}
