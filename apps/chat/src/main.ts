import { NestFactory } from '@nestjs/core';
import { ChatModule } from './chat.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as crypto from 'crypto';

// Ensure crypto is available globally for MongoDB driver
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = crypto;
}

const logger = new Logger('ChatService');

async function bootstrap() {
  const clean = (s?: string, def = '') => (s || def).replace(/^["']+|["']+$/g, '').trim();
  const rmqURL = clean(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672');
  const queue = clean(process.env.CHAT_QUEUE, 'chat_queue');
  
  logger.log(`🚀 Starting Chat Service (with crypto fix)...`);
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
        // Add connection event handlers
        socketOptions: {
          heartbeatIntervalInSeconds: 60,
          reconnectTimeInSeconds: 5,
        },
      },
      logger: ['error', 'warn', 'log', 'debug'],
    },
  );
  
  // Log RabbitMQ connection events
  app.enableShutdownHooks();
  
  logger.log(`🔌 Attempting to connect to RabbitMQ and subscribe to queue...`);
  
  await app.listen();
  logger.log(`✅ Chat service is running on queue ${queue}`);
  logger.log(`🎯 Waiting for messages on RabbitMQ...`);
  logger.log(`📝 Listening for message patterns: getUserRooms, createRoom, etc.`);
  
  // Test that the controller is registered
  const server = app.get('ChatController');
  if (server) {
    logger.log(`✅ ChatController is registered and ready`);
  } else {
    logger.error(`❌ ChatController NOT registered!`);
  }
}

bootstrap().catch((err) => {
  logger.error('❌ Failed to bootstrap chat service:', err);
  logger.error('Stack trace:', err.stack);
  process.exit(1);
});
