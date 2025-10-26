// Mock environment configuration for tests

export const env = {
  NODE_ENV: 'test',
  PORT: 3000,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/speedy_test',
  WHATSAPP_API_URL: 'https://api.test.com',
  WHATSAPP_ACCOUNT_SID: 'test_account_sid',
  WHATSAPP_AUTH_TOKEN: 'test_auth_token',
  WHATSAPP_PHONE_NUMBER: '+972501234567',
  WEBHOOK_SECRET: 'test_webhook_secret',
  JWT_SECRET: 'test_jwt_secret',
  SENTRY_DSN: '',
  LOG_LEVEL: 'error',
  ENABLE_RATE_LIMITING: false,
  MAX_REQUESTS_PER_MINUTE: 20,
  CACHE_TTL_SECONDS: 300,
  CACHE_MAX_ITEMS: 100,
  CONVERSATION_TIMEOUT_MINUTES: 30,
  PRISMA_STUDIO_PORT: 5555,
  DEBUG_SQL: false,
  ALLOWED_ORIGINS: '*',
  FORCE_HTTPS: false,
};

/**
 * Derived configuration values
 */
export const config = {
  isDevelopment: false,
  isProduction: false,
  isTest: true,
  
  // Database
  database: {
    url: env.DATABASE_URL,
    enableLogging: env.DEBUG_SQL,
  },
  
  // Server
  server: {
    port: env.PORT,
    corsOrigins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
    forceHttps: env.FORCE_HTTPS,
  },
  
  // WhatsApp
  whatsapp: {
    apiUrl: env.WHATSAPP_API_URL,
    accountSid: env.WHATSAPP_ACCOUNT_SID,
    authToken: env.WHATSAPP_AUTH_TOKEN,
    phoneNumber: env.WHATSAPP_PHONE_NUMBER,
  },
  
  // Security
  security: {
    webhookSecret: env.WEBHOOK_SECRET,
    jwtSecret: env.JWT_SECRET,
  },
  
  // Features
  features: {
    rateLimiting: env.ENABLE_RATE_LIMITING,
    maxRequestsPerMinute: env.MAX_REQUESTS_PER_MINUTE,
  },
  
  // Cache
  cache: {
    ttlSeconds: env.CACHE_TTL_SECONDS,
    maxItems: env.CACHE_MAX_ITEMS,
  },
  
  // Conversation
  conversation: {
    timeoutMinutes: env.CONVERSATION_TIMEOUT_MINUTES,
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: env.SENTRY_DSN,
    logLevel: env.LOG_LEVEL,
  },
};
