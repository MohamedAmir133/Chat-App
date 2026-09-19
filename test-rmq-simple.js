/**
 * Simple RabbitMQ Connection Test
 * Just checks if we can connect to RabbitMQ
 */

const amqp = require('amqplib');
require('dotenv').config();

const clean = (s, def = '') => (s || def).replace(/^["']+|["']+$/g, '').trim();

async function testConnection() {
  const rmqURL = clean(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672');
  
  console.log('\n🔍 Testing RabbitMQ Connection...');
  console.log(`📡 URL: ${rmqURL.replace(/:[^:@]+@/, ':****@')}\n`);
  
  try {
    console.log('⏳ Connecting to RabbitMQ...');
    const connection = await amqp.connect(rmqURL);
    console.log('✅ Connected to RabbitMQ successfully!');
    
    const channel = await connection.createChannel();
    console.log('✅ Channel created successfully!');
    
    // Check queues
    const queues = ['auth_queue', 'chat_queue', 'user_queue'];
    console.log('\n📬 Checking queues:');
    
    for (const queueName of queues) {
      try {
        const q = await channel.checkQueue(queueName);
        console.log(`  ${queueName}: ✅ Exists (${q.messageCount} messages, ${q.consumerCount} consumers)`);
        
        if (q.consumerCount === 0) {
          console.log(`    ⚠️  WARNING: No consumers! The ${queueName.replace('_queue', '')} service is not running.`);
        }
      } catch (err) {
        console.log(`  ${queueName}: ❌ Does not exist`);
      }
    }
    
    await channel.close();
    await connection.close();
    
    console.log('\n✅ Test completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Connection failed!');
    console.error(`Error: ${err.message}`);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 RabbitMQ is not running. Start it with:');
      console.error('   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management');
    }
    
    console.log('');
    process.exit(1);
  }
}

testConnection();
