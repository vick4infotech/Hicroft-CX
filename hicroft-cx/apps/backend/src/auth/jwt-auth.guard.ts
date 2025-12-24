import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * HTTP JWT guard (Passport).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
