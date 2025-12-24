import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { OrgsModule } from "./orgs/orgs.module";
import { QueuesModule } from "./queues/queues.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ScreensModule } from "./screens/screens.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { WebsocketModule } from "./websocket/websocket.module";

/**
 * Root module wiring up:
 * - Config (env)
 * - Throttling (rate limiting) as global guard
 * - Prisma
 * - Domain modules
 */
@Module({
  imports: [
    // Load env from monorepo root as well as local folder.
    // This makes `cp .env.example .env` at repo root work out-of-the-box.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute
        limit: 120, // basic protection
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrgsModule,
    QueuesModule,
    TicketsModule,
    ScreensModule,
    AnalyticsModule,
    WebsocketModule,
  ],
  providers: [
    // Global rate limiter guard (DI-friendly)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
