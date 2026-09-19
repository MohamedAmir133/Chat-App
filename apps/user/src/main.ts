import { NestFactory } from '@nestjs/core';
import { UserModule } from './user.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
        queue: process.env.USER_QUEUE || 'user_queue',
        queueOptions: { durable: false },
      },
    },
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen();
  console.log(
    'User service is running on queue:',
    process.env.USER_QUEUE || 'user_queue',
  );
}
bootstrap().catch((err) => {
  console.error('[USER ERROR] Failed to bootstrap user service:', err);
  process.exit(1);
});
