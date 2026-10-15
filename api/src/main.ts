import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Support configured frontend origins and stable Vercel deployment URLs
  // for this project. Avoid a blanket *.vercel.app allowance.
  const configuredOrigins = [
    ...(process.env.CORS_ORIGINS || '').split(','),
    ...(process.env.CORS_ORIGIN || '').split(','),
  ].map((origin) => origin.trim()).filter(Boolean);
  const corsOrigins = new Set(
    configuredOrigins.length ? configuredOrigins : ['http://localhost:5173'],
  );
  const isTrustedVercelOrigin = (origin: string) =>
    /^https:\/\/omega-solutions-[a-z0-9-]+-pestria72-2760\.vercel\.app$/.test(origin);

  app.enableCors({
    origin: (origin, callback) => {
      // Requests without an Origin header are server-to-server/non-browser calls.
      if (!origin || corsOrigins.has(origin) || isTrustedVercelOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
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
