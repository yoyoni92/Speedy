/**
 * WhatsApp Module
 *
 * Provides WhatsApp Business API integration with Hebrew text support
 * and message formatting capabilities.
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './services/whatsapp.service';
import { MessageFormatterService } from './services/message-formatter.service';

@Module({
  imports: [
    HttpModule, // Required for WhatsApp API calls
  ],
  providers: [
    WhatsAppService,
    MessageFormatterService,
  ],
  exports: [
    WhatsAppService,
    MessageFormatterService,
  ],
})
export class WhatsAppModule {}
