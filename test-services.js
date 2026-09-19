/**
 * Service Health Check
 * Checks environment variables and database connections
 */

require('dotenv').config();

const clean = (s, def = '') => (s || def).replace(/^["']+|["']+$/g, '').trim();

console.log('\n🔍 Service Health Check\n');
console.log('═══════════════════════════════════════════════════════\n');

// Environment Variables
console.log('📋 Environment Variables:');
console.log('─────────────────────────────────────────────────────');
console.log(`NODE_ENV:        ${process.env.NODE_ENV || '❌ Not set'}`);
console.log(`PORT:            ${process.env.PORT || '❌ Not set (default: 6000)'}`);

// RabbitMQ
console.log('\n📡 RabbitMQ Configuration:');
console.log('─────────────────────────────────────────────────────');
const rmqURL = clean(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672');
console.log(`URL:             ${rmqURL.replace(/:[^:@]+@/, ':****@')}`);
console.log(`AUTH_QUEUE:      ${clean(process.env.AUTH_QUEUE, 'auth_queue')}`);
console.log(`CHAT_QUEUE:      ${clean(process.env.CHAT_QUEUE, 'chat_queue')}`);
console.log(`USER_QUEUE:      ${clean(process.env.USER_QUEUE, 'user_queue')}`);

// MongoDB
console.log('\n🗄️  MongoDB Configuration:');
console.log('─────────────────────────────────────────────────────');
const mongoVars = [
  { name: 'MONGO_URI', value: process.env.MONGO_URI },
  { name: 'MONGODB_URI', value: process.env.MONGODB_URI },
  { name: 'MONGODB_URL', value: process.env.MONGODB_URL },
  { name: 'MONGO_URL', value: process.env.MONGO_URL },
];

let mongoFound = false;
mongoVars.forEach(({ name, value }) => {
  if (value) {
    console.log(`${name}: ✅ ${value.replace(/:[^:@]+@/, ':****@')}`);
    mongoFound = true;
  } else {
    console.log(`${name}: ❌ Not set`);
  }
});

if (!mongoFound) {
  console.log('\n⚠️  WARNING: No MongoDB URI found! Services will fail to start.');
}

// PostgreSQL
console.log('\n🐘 PostgreSQL Configuration:');
console.log('─────────────────────────────────────────────────────');
console.log(`DB_HOST:         ${process.env.DB_HOST || '❌ Not set'}`);
console.log(`DB_PORT:         ${process.env.DB_PORT || '❌ Not set'}`);
console.log(`DB_USER:         ${process.env.DB_USER || '❌ Not set'}`);
console.log(`DB_PASSWORD:     ${process.env.DB_PASSWORD ? '✅ Set' : '❌ Not set'}`);
console.log(`DB_NAME:         ${process.env.DB_NAME || '❌ Not set'}`);
console.log(`DB_SSL:          ${process.env.DB_SSL || '❌ Not set (needed for cloud)'}`);

// Alternative DATABASE_URL
if (process.env.DATABASE_URL) {
  console.log(`DATABASE_URL:    ✅ ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
}

// JWT
console.log('\n🔐 JWT Configuration:');
console.log('─────────────────────────────────────────────────────');
console.log(`JWT_SECRET:      ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`JWT_EXPIRES_IN:  ${process.env.JWT_EXPIRES_IN || '❌ Not set (default: 7d)'}`);

// Redis
console.log('\n💾 Redis Configuration:');
console.log('─────────────────────────────────────────────────────');
if (process.env.REDIS_URL) {
  console.log(`REDIS_URL:       ✅ ${process.env.REDIS_URL.replace(/:[^:@]+@/, ':****@')}`);
} else {
  console.log(`REDIS_HOST:      ${process.env.REDIS_HOST || '❌ Not set (default: localhost)'}`);
  console.log(`REDIS_PORT:      ${process.env.REDIS_PORT || '❌ Not set (default: 6379)'}`);
  console.log(`REDIS_PASSWORD:  ${process.env.REDIS_PASSWORD ? '✅ Set' : '❌ Not set'}`);
  console.log(`REDIS_TLS:       ${process.env.REDIS_TLS || '❌ Not set'}`);
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 Summary:');
console.log('─────────────────────────────────────────────────────');

const checks = [
  { name: 'RabbitMQ URL', ok: !!process.env.RABBITMQ_URL },
  { name: 'MongoDB URI', ok: mongoFound },
  { name: 'PostgreSQL', ok: !!process.env.DB_HOST && !!process.env.DB_USER },
  { name: 'JWT Secret', ok: !!process.env.JWT_SECRET },
];

checks.forEach(({ name, ok }) => {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
});

const allOk = checks.every(c => c.ok);
if (allOk) {
  console.log('\n✅ All required environment variables are set!\n');
} else {
  console.log('\n⚠️  Some required environment variables are missing!\n');
  console.log('💡 Check your .env file or Railway environment variables.\n');
}

console.log('═══════════════════════════════════════════════════════\n');
