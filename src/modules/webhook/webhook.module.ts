/**
 * Webhook Module - WhatsApp Webhook Processing
 *
 * Handles incoming WhatsApp Business API webhooks with authentication,
 * message processing, and bot coordination.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './controllers/webhook.controller';
import { WebhookService } from './services/webhook.service';

// Import required services from other modules
import { AuthModule } from '../auth/auth.module';
import { BotModule } from '../bot/bot.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,      // For user authentication
    BotModule,       // For bot message processing
    WhatsAppModule,  // For WhatsApp service integration
  ],
  controllers: [
    WebhookController,
  ],
  providers: [
    WebhookService,
  ],
  exports: [
    WebhookService,
  ],
})
export class WebhookModule {}
