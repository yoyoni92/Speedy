import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { env } from './config/env.config';
import { PrismaModule } from './database/prisma.module';

/**
 * Root application module for Speedy Fleet Management
 * Configures all global modules and services
 */
@Module({
  imports: [
    // Configuration (global)
    ConfigModule.forRoot({
      isGlobal: true,
      validate: () => env, // Validates environment on startup
    }),

    // Logging with Winston
    WinstonModule.forRoot({
      level: env.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        // File transport for errors
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // File transport for all logs
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: env.MAX_REQUESTS_PER_MINUTE,
      },
    ]),

    // Caching (in-memory for MVP)
    CacheModule.register({
      isGlobal: true,
      ttl: env.CACHE_TTL_SECONDS * 1000, // Convert to milliseconds
      max: env.CACHE_MAX_ITEMS,
    }),

    // Scheduling (for future Phase 2 notifications)
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Feature modules will be added here as we implement them
    // AuthModule,
    // WebhookModule,
    // BotModule,
    // FleetModule,
    // MaintenanceModule,
    // WhatsAppModule,
    // HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
