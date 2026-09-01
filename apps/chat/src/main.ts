import { NestFactory } from '@nestjs/core';
import { ChatModule } from './chat.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger();
  const rmqURL =
    process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
  const queue = process.env.CHAT_QUEUE ?? 'chat_queue';
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ChatModule,
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
  logger.log(`chat service is running on queue ${queue}`);
}
bootstrap();
