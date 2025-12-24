import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Role } from "../common/enums/role.enum";
import { ACCESS_TOKEN_COOKIE } from "./auth.constants";
import { AuthUser } from "../common/types/auth-user";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  orgId: string | null;
  name: string;
};

function cookieExtractor(req: any): string | null {
  return req?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

/**
 * JWT access token strategy.
 *
 * Extracts token from httpOnly cookie primarily, with a Bearer fallback.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET") ?? "change-me-access",
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      orgId: payload.orgId,
      name: payload.name,
    };
  }
}
