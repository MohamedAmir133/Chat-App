/**
 * RabbitMQ Connection Test
 * Tests if Chat and User services can be reached via RabbitMQ
 */

const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');

require('dotenv').config();

const clean = (s, def = '') => (s || def).replace(/^["']+|["']+$/g, '').trim();

async function testRabbitMQConnection() {
  console.log('\n🔍 Testing RabbitMQ Connection...\n');
  
  const rmqURL = clean(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672');
  console.log(`📡 RabbitMQ URL: ${rmqURL.replace(/:[^:@]+@/, ':****@')}`);
  
  // Test Chat Service
  console.log('\n─── Testing Chat Service ───');
  const chatQueue = clean(process.env.CHAT_QUEUE, 'chat_queue');
  console.log(`📬 Queue: ${chatQueue}`);
  
  const chatClient = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [rmqURL],
      queue: chatQueue,
      queueOptions: { durable: false },
    },
  });

  try {
    await chatClient.connect();
    console.log('✅ Connected to Chat queue');
    
    // Test getUserRooms message
    console.log('\n📤 Sending test message: getUserRooms');
    const testUserId = 'test-user-id';
    
    const result = await firstValueFrom(
      chatClient.send('getUserRooms', { userId: testUserId }).pipe(timeout(5000))
    );
    
    console.log('✅ Chat service responded:', result);
  } catch (err) {
    console.error('❌ Chat service error:', err.message);
    if (err.message === 'Timeout has occurred') {
      console.error('   → Chat service is not responding. Check if chat service is running.');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.error('   → Cannot connect to RabbitMQ. Check if RabbitMQ is running.');
    }
  } finally {
    await chatClient.close();
  }
  
  // Test User Service
  console.log('\n─── Testing User Service ───');
  const userQueue = clean(process.env.USER_QUEUE, 'user_queue');
  console.log(`📬 Queue: ${userQueue}`);
  
  const userClient = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [rmqURL],
      queue: userQueue,
      queueOptions: { durable: false },
    },
  });

  try {
    await userClient.connect();
    console.log('✅ Connected to User queue');
    
    // Test getUserById message
    console.log('\n📤 Sending test message: getUserById');
    const testUserId = 'test-user-id';
    
    const result = await firstValueFrom(
      userClient.send('getUserById', { userId: testUserId }).pipe(timeout(5000))
    );
    
    console.log('✅ User service responded:', result);
  } catch (err) {
    console.error('❌ User service error:', err.message);
    if (err.message === 'Timeout has occurred') {
      console.error('   → User service is not responding. Check if user service is running.');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.error('   → Cannot connect to RabbitMQ. Check if RabbitMQ is running.');
    }
  } finally {
    await userClient.close();
  }
  
  console.log('\n✅ Test completed\n');
  process.exit(0);
}

testRabbitMQConnection().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
