import { NestFactory } from '@nestjs/core';
import { ChatModule } from './chat.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

const logger = new Logger('ChatService');

async function bootstrap() {
  const clean = (s?: string, def = '') => (s || def).replace(/^["']+|["']+$/g, '').trim();
  const rmqURL = clean(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672');
  const queue = clean(process.env.CHAT_QUEUE, 'chat_queue');
  
  logger.log(`🚀 Starting Chat Service...`);
  logger.log(`📡 RabbitMQ URL: ${rmqURL.replace(/:[^:@]+@/, ':****@')}`);
  logger.log(`📬 Queue: ${queue}`);
  logger.log(`🗄️  MongoDB URI: ${process.env.MONGO_URI ? 'Set ✅' : 'Not set ❌'}`);
  logger.log(`🐘 PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  
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
        noAck: false,
        prefetchCount: 1,
      },
      logger: ['error', 'warn', 'log', 'debug'],
    },
  );
  
  app.enableShutdownHooks();
  await app.listen();
  logger.log(`✅ Chat service is running on queue ${queue}`);
}

bootstrap().catch((err) => {
  logger.error('❌ Failed to bootstrap chat service:', err);
  logger.error('Stack trace:', err.stack);
  process.exit(1);
});
