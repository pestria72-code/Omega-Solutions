import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Support multiple explicit frontend origins for production and Vercel previews.
  // Keep backwards compatibility with the existing CORS_ORIGIN setting.
  const configuredOrigins = [
    ...(process.env.CORS_ORIGINS || '').split(','),
    ...(process.env.CORS_ORIGIN || '').split(','),
  ].map((origin) => origin.trim()).filter(Boolean);
  const corsOrigins = [...new Set(configuredOrigins.length ? configuredOrigins : ['http://localhost:5173'])];

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Omega API listening on port ${port}`);
}
await bootstrap();
