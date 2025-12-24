import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ACCESS_TOKEN_COOKIE } from "./auth.constants";

/**
 * WebSocket auth guard:
 * - validates JWT from cookie or handshake auth.token
 * - attaches `client.data.user` for downstream use
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: any = context.switchToWs().getClient();

    const cookieHeader: string | undefined = client?.handshake?.headers?.cookie;
    // Parse cookie header for our access token cookie.
    const cookieToken = cookieHeader
      ? cookieHeader
          .split(";")
          .map((s) => s.trim())
          .find((c) => c.startsWith(`${ACCESS_TOKEN_COOKIE}=`))
          ?.split("=")[1]
      : undefined;

    const token = cookieToken || client?.handshake?.auth?.token;
    if (!token) return false;

    try {
      const payload = this.jwt.verify(token, { secret: this.config.get<string>("JWT_ACCESS_SECRET") });
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        orgId: payload.orgId ?? null,
        name: payload.name,
      };
      return true;
    } catch {
      return false;
    }
  }
}
