/**
 * Health Module - System Health Monitoring
 *
 * Provides comprehensive health check endpoints for monitoring
 * system status, service availability, and database connectivity.
 */

import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';

// Import required services from other modules
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WebhookModule } from '../webhook/webhook.module';
import { BotModule } from '../bot/bot.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,   // Database health checks
    AuthModule,     // Auth service health
    WebhookModule,  // Webhook service health
    BotModule,      // Bot service health
    WhatsAppModule, // WhatsApp service health
  ],
  controllers: [
    HealthController,
  ],
})
export class HealthModule {}