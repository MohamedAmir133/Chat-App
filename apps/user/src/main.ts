import { NestFactory } from '@nestjs/core';
import { UserModule } from './user.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('UserService');

async function bootstrap() {
  const clean = (s?: string, def = '') => (s || def).replace(/^["']+|["']+$/g, '').trim();
  const rmqURL = clean(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672');
  const queue = clean(process.env.USER_QUEUE, 'user_queue');

  logger.log(`🚀 Starting User Service...`);
  logger.log(`📡 RabbitMQ URL: ${rmqURL.replace(/:[^:@]+@/, ':****@')}`);
  logger.log(`📬 Queue: ${queue}`);
  logger.log(`🗄️  MongoDB URI: ${process.env.MONGO_URI ? 'Set ✅' : 'Not set ❌'}`);
  logger.log(`🐘 PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rmqURL],
        queue: queue,
        queueOptions: { durable: false },
        noAck: false,
        prefetchCount: 1,
      },
      logger: ['error', 'warn', 'log', 'debug'],
    },
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen();
  logger.log(`✅ User service is running on queue ${queue}`);
}
bootstrap().catch((err) => {
  logger.error('❌ Failed to bootstrap user service:', err);
  logger.error('Stack trace:', err.stack);
  process.exit(1);
});
