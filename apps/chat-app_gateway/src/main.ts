import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

const logger = new Logger('Gateway');

async function bootstrap() {
  logger.log('🚀 Starting API Gateway...');
  logger.log(`📡 RabbitMQ URL: ${process.env.RABBITMQ_URL ? process.env.RABBITMQ_URL.replace(/:[^:@]+@/, ':****@') : 'Using default'}`);
  logger.log(`📬 Queues: auth=${process.env.AUTH_QUEUE || 'auth_queue'}, chat=${process.env.CHAT_QUEUE || 'chat_queue'}, user=${process.env.USER_QUEUE || 'user_queue'}`);
  logger.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set ✅' : 'Not set ❌'}`);
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Cors : Allow all origins 
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  

    // Support the frontend's same-origin /api/* requests alongside direct API routes.
    app.use((req, _res, next) => {
      if (req.url === '/api' || req.url.startsWith('/api/')) {
        req.url = req.url.slice(4) || '/';
      }
      next();
    });
  app.use(cookieParser('secretKey'));

  const uploadDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.log(`📁 Created uploads directory: ${uploadDir}`);
  }
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  const frontendDir = join(process.cwd(), 'apps', 'web', 'out');
  if (fs.existsSync(frontendDir)) {
    app.useStaticAssets(frontendDir, {
      index: 'index.html',
    });
    app.getHttpAdapter().getInstance().get('/', (_req: any, res: any) => {
      res.sendFile(join(frontendDir, 'index.html'));
    });
    logger.log(`🌐 Serving frontend from: ${frontendDir}`);
  }

  const port = process.env.PORT ?? 6000;
  await app.listen(port);
  logger.log(`✅ API Gateway is running on port ${port}`);
  logger.log(`🌐 Access at: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  logger.error('❌ Failed to bootstrap gateway:', err);
  logger.error('Stack trace:', err.stack);
  process.exit(1);
});
