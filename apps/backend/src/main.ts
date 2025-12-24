import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";

/**
 * App bootstrap:
 * - CORS restricted to FRONTEND_URL (credentials enabled)
 * - Global validation pipe (DTO validation)
 * - Rate limiting is configured in AppModule as a global guard
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const frontendUrl = config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";

  // Dev ergonomics: if the frontend starts on a different port (3001, 3002) or
  // you open via 127.0.0.1 instead of localhost, strict single-origin CORS
  // will break login with a generic "Failed to fetch".
  const nodeEnv = (config.get<string>("NODE_ENV") ?? "development").toLowerCase();
  const isProd = nodeEnv === "production";

  app.enableCors({
    origin: isProd ? frontendUrl : true, // reflect request origin in dev
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(config.get<string>("PORT") ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}

bootstrap();
