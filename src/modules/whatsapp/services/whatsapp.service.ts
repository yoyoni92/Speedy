/**
 * WhatsApp Service - API Integration
 *
 * Handles WhatsApp Business API integration for sending messages,
 * processing webhooks, and managing conversation flow.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MessageFormatterService } from './message-formatter.service';

export interface WhatsAppMessage {
  id: string;
  from: string; // Phone number
  type: 'text' | 'interactive' | 'template';
  timestamp: string;
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
  };
}

export interface SendMessageRequest {
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status: string;
  }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly messageFormatter: MessageFormatterService,
  ) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0');
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp credentials not configured - messages will be logged only');
    }
  }

  /**
   * Send text message to WhatsApp
   */
  async sendTextMessage(to: string, body: string): Promise<string> {
    try {
      // Format message for WhatsApp (ensure proper encoding)
      const formattedBody = this.messageFormatter.formatForWhatsApp(body);

      const payload: SendMessageRequest = {
        to: this.formatPhoneNumber(to),
        type: 'text',
        text: {
          body: formattedBody,
        },
      };

      const messageId = await this.sendMessage(payload);
      this.logger.log(`Text message sent to ${to}: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to send text message to ${to}:`, error);
      throw new HttpException(
        'Failed to send WhatsApp message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send template message to WhatsApp
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string = 'he',
    components?: any[],
  ): Promise<string> {
    try {
      const payload: SendMessageRequest = {
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language,
          },
          ...(components && { components }),
        },
      };

      const messageId = await this.sendMessage(payload);
      this.logger.log(`Template message sent to ${to}: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to send template message to ${to}:`, error);
      throw new HttpException(
        'Failed to send WhatsApp template message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send message via WhatsApp API
   */
  private async sendMessage(payload: SendMessageRequest): Promise<string> {
    // For development/testing without real WhatsApp API
    const currentAccessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    const currentPhoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');

    if (!currentAccessToken || !currentPhoneNumberId) {
      const mockMessageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.logger.log(`[MOCK] Would send WhatsApp message:`, payload);
      return mockMessageId;
    }

    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      const response = await firstValueFrom(
        this.httpService.post<WhatsAppApiResponse>(url, payload, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (response.data.messages && response.data.messages.length > 0) {
        return response.data.messages[0]?.id || '';
      }

      throw new Error('No message ID returned from WhatsApp API');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = (error as any)?.response?.data;
      this.logger.error('WhatsApp API error:', errorData || errorMessage);
      throw error;
    }
  }

  /**
   * Process incoming webhook message
   */
  processIncomingMessage(webhookData: any): WhatsAppMessage | null {
    try {
      // Extract message from webhook payload
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages;

      if (!messages || messages.length === 0) {
        return null;
      }

      const message = messages[0];

      // Convert WhatsApp webhook format to our internal format
      const processedMessage: WhatsAppMessage = {
        id: message.id,
        from: message.from,
        type: message.type,
        timestamp: message.timestamp,
        text: message.text,
        interactive: message.interactive,
        template: message.template,
      };

      this.logger.log(`Processed incoming WhatsApp message: ${processedMessage.from}`);
      return processedMessage;
    } catch (error) {
      this.logger.error('Failed to process incoming WhatsApp message:', error);
      return null;
    }
  }

  /**
   * Verify webhook signature (for production security)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // In production, implement proper signature verification
    // For MVP, we'll trust the webhook
    this.logger.log('Webhook signature verification skipped (MVP mode)');
    return true;
  }

  /**
   * Format phone number for WhatsApp API
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-numeric characters
    let cleanPhone = phone.replace(/\D/g, '');

    // Handle Israeli phone numbers
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      // Remove leading 0 and add country code
      cleanPhone = '972' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9 && cleanPhone.startsWith('5')) {
      // Add country code for 9-digit numbers starting with 5
      cleanPhone = '972' + cleanPhone;
    } else if (!cleanPhone.startsWith('972') && cleanPhone.length === 9) {
      // Add country code for other 9-digit numbers
      cleanPhone = '972' + cleanPhone;
    }

    return cleanPhone;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): { status: string; configured: boolean } {
    const configured = !!(this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '') &&
                         this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', ''));

    return {
      status: configured ? 'healthy' : 'development',
      configured,
    };
  }
}
