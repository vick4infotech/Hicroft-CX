import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { User } from "@prisma/client";
import { Role } from "../common/enums/role.enum";
import { PrismaService } from "../prisma/prisma.service";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  orgId: string | null;
  name: string;
};

export type Tokens = { accessToken: string; refreshToken: string };

/**
 * AuthService implements login/refresh/logout and token issuance.
 *
 * Refresh token is stored hashed in DB (rotation supported).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    return user;
  }

  private async signTokens(payload: JwtPayload): Promise<Tokens> {
    const accessExpiresIn =
      this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
    const refreshExpiresIn =
      this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET") ?? "change-me-access",
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET") ?? "change-me-refresh",
      expiresIn: refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  private async setRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async login(email: string, password: string): Promise<{ user: Omit<User, "passwordHash" | "refreshTokenHash">; tokens: Tokens }> {
    const user = await this.validateUser(email, password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId ?? null,
      name: user.name,
    };

    const tokens = await this.signTokens(payload);
    await this.setRefreshTokenHash(user.id, tokens.refreshToken);

    // Avoid leaking passwordHash/refreshTokenHash to the client.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, refreshTokenHash, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async refresh(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) throw new ForbiddenException("Access denied");

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new ForbiddenException("Access denied");

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId ?? null,
      name: user.name,
    };

    const tokens = await this.signTokens(payload);
    // Rotate refresh token
    await this.setRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  /**
   * Verify refresh token JWT and return its payload.
   * We still compare the raw token against the stored hash in refresh().
   */
  async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET") ?? "change-me-refresh",
      });
    } catch {
      throw new ForbiddenException("Invalid refresh token");
    }
  }
}
