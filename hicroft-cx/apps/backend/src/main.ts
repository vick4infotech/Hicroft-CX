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
  app.enableCors({
    origin: frontendUrl,
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
