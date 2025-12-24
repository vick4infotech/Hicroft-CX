import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Standard JWT auth guard.
 * Reads JWT via passport strategy (cookie or Authorization header).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
