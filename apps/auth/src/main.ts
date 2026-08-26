import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger();
  const rmqURL =
    process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
  const queue = process.env.AUTH_QUEUE ?? 'auth_queue';
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rmqURL],
        queue: queue,
        queueOptions: {
          durable: false,
        },
      },
    },
  );
  app.enableShutdownHooks();
  await app.listen();
  logger.log(`Auth service is running on queue ${queue}`);
}
bootstrap();
