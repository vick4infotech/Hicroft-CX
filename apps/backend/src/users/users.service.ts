import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { Role } from "../common/enums/role.enum";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types/auth-user";
import { CreateUserDto } from "./dto/create-user.dto";

/**
 * UsersService: org-scoped user management.
 *
 * Super Admin can create and list across orgs (via optional orgId filter).
 * Admin can create managers/agents for their org.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(requester: AuthUser, orgId?: string): Promise<Omit<User, "passwordHash" | "refreshTokenHash">[]> {
    if (requester.role === Role.SUPER_ADMIN) {
      const users = await this.prisma.user.findMany({
        where: orgId ? { orgId } : {},
        orderBy: { createdAt: "asc" },
      });
      return users.map(this.stripSecrets);
    }

    // Org-bound roles can only list within their org
    if (!requester.orgId) throw new ForbiddenException("Org context required");

    const users = await this.prisma.user.findMany({
      where: { orgId: requester.orgId },
      orderBy: { createdAt: "asc" },
    });
    return users.map(this.stripSecrets);
  }

  async create(requester: AuthUser, dto: CreateUserDto): Promise<Omit<User, "passwordHash" | "refreshTokenHash">> {
    // Super Admin can create any role/user, optionally assigning orgId.
    if (requester.role === Role.SUPER_ADMIN) {
      const passwordHash = await bcrypt.hash(dto.password, 12);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          role: dto.role,
          passwordHash,
          orgId: dto.orgId ?? null,
        },
      });
      return this.stripSecrets(user);
    }

    // Admin: can create MANAGER/AGENT only, within their org.
    if (requester.role !== Role.ADMIN) throw new ForbiddenException("Not allowed");
    if (!requester.orgId) throw new ForbiddenException("Org context required");

    if (![Role.MANAGER, Role.AGENT].includes(dto.role)) {
      throw new BadRequestException("Admin can only create managers or agents");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash,
        orgId: requester.orgId,
      },
    });

    return this.stripSecrets(user);
  }

  private stripSecrets(u: User): Omit<User, "passwordHash" | "refreshTokenHash"> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, refreshTokenHash, ...safe } = u;
    return safe;
  }
}
