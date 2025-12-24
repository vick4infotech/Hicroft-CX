import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.constants";
import { ConfigService } from "@nestjs/config";
import { AuthUser } from "../common/types/auth-user";

function parseDurationToMs(input: string): number {
  // Extremely small, practical parser for: 15m, 7d, 12h, 30s
  const match = /^([0-9]+)([smhd])$/i.exec(input.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] ?? 0);
}

/**
 * AuthController sets httpOnly cookies and provides refresh rotation.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  private cookieOptions() {
    const secure = (this.config.get<string>("COOKIE_SECURE") ?? "false") === "true";
    const domain = this.config.get<string>("COOKIE_DOMAIN") ?? "";

    return {
      httpOnly: true,
      sameSite: "lax" as const,
      secure,
      domain: domain.length > 0 ? domain : undefined,
      path: "/",
    };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto.email, dto.password);

    const accessTtl = this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
    const refreshTtl = this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";

    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...this.cookieOptions(),
      maxAge: parseDurationToMs(accessTtl) || undefined,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(),
      maxAge: parseDurationToMs(refreshTtl) || undefined,
    });

    return { user };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      return { ok: false };
    }

    const payload = await this.auth.verifyRefreshToken(refreshToken);
    const tokens = await this.auth.refresh(payload.sub, refreshToken);

    const accessTtl = this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
    const refreshTtl = this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";

    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...this.cookieOptions(),
      maxAge: parseDurationToMs(accessTtl) || undefined,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(),
      maxAge: parseDurationToMs(refreshTtl) || undefined,
    });

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as AuthUser;
    await this.auth.logout(user.id);

    res.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions());

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: Request) {
    const u = req.user as AuthUser;
    // Frontend consumes a flat shape (no nesting) to keep server components simple.
    return {
      userId: u.id,
      email: u.email,
      role: u.role,
      orgId: u.orgId,
      name: u.name,
    };
  }
}
