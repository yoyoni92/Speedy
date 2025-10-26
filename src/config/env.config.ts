import { cleanEnv, str, port, url, num, bool } from 'envalid';

/**
 * Environment configuration using Envalid for type-safe validation
 * All environment variables are validated at startup
 */
export const env = cleanEnv(process.env, {
  // Application
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
    desc: 'Application environment',
  }),
  PORT: port({
    default: 3000,
    desc: 'Server port',
  }),

  // Database
  DATABASE_URL: url({
    desc: 'PostgreSQL connection string',
    example: 'postgresql://user:pass@host:5432/db',
  }),

  // WhatsApp API
  WHATSAPP_API_URL: url({
    desc: 'WhatsApp API base URL',
    default: 'https://api.twilio.com/2010-04-01',
  }),
  WHATSAPP_ACCOUNT_SID: str({
    desc: 'WhatsApp account SID',
  }),
  WHATSAPP_AUTH_TOKEN: str({
    desc: 'WhatsApp authentication token',
  }),
  WHATSAPP_PHONE_NUMBER: str({
    desc: 'WhatsApp business phone number in E.164 format',
    example: '+972501234567',
  }),

  // Security
  WEBHOOK_SECRET: str({
    desc: 'WhatsApp webhook verification token',
  }),
  JWT_SECRET: str({
    desc: 'JWT signing secret',
    default: 'dev-jwt-secret-change-in-production',
  }),

  // Monitoring
  SENTRY_DSN: str({
    desc: 'Sentry DSN for error tracking',
    default: '',
  }),
  LOG_LEVEL: str({
    choices: ['error', 'warn', 'info', 'debug'],
    default: 'info',
    desc: 'Logging level',
  }),

  // Features
  ENABLE_RATE_LIMITING: bool({
    default: true,
    desc: 'Enable rate limiting',
  }),
  MAX_REQUESTS_PER_MINUTE: num({
    default: 20,
    desc: 'Maximum requests per minute per IP',
  }),

  // Cache
  CACHE_TTL_SECONDS: num({
    default: 300,
    desc: 'Cache TTL in seconds',
  }),
  CACHE_MAX_ITEMS: num({
    default: 100,
    desc: 'Maximum items in cache',
  }),

  // Conversation
  CONVERSATION_TIMEOUT_MINUTES: num({
    default: 30,
    desc: 'Conversation timeout in minutes',
  }),

  // Development
  PRISMA_STUDIO_PORT: port({
    default: 5555,
    desc: 'Prisma Studio port',
  }),
  DEBUG_SQL: bool({
    default: false,
    desc: 'Enable SQL query debugging',
  }),

  // Production
  ALLOWED_ORIGINS: str({
    default: '*',
    desc: 'Allowed CORS origins (comma-separated)',
  }),
  FORCE_HTTPS: bool({
    default: false,
    desc: 'Force HTTPS redirect',
  }),
});

/**
 * Derived configuration values
 */
export const config = {
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
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
} as const;
