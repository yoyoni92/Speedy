/**
 * Webhook Service - WhatsApp Webhook Processing
 *
 * Handles incoming WhatsApp Business API webhooks, validates requests,
 * processes messages, and coordinates with the bot service.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import { BotService } from '../../bot/services/bot.service';
import { WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { WebhookPayload, WebhookEntry } from '../../../types/domain.types';

export interface WebhookProcessingResult {
  success: boolean;
  messagesProcessed: number;
  errors: string[];
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly authService: AuthService,
    private readonly botService: BotService,
  ) {}

  /**
   * Process incoming WhatsApp webhook
   */
  async processWebhook(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    const result: WebhookProcessingResult = {
      success: true,
      messagesProcessed: 0,
      errors: [],
    };

    try {
      // Validate webhook payload structure
      if (!this.isValidWebhookPayload(payload)) {
        throw new BadRequestException('Invalid webhook payload structure');
      }

      // Process each entry
      for (const entry of payload.entry) {
        try {
          const entryResult = await this.processWebhookEntry(entry);
          result.messagesProcessed += entryResult.messagesProcessed;

          if (entryResult.errors.length > 0) {
            result.errors.push(...entryResult.errors);
          }
        } catch (error) {
          const errorMsg = `Failed to process webhook entry: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMsg, error);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }
    } catch (error) {
      const errorMsg = `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errorMsg, error);
      result.errors.push(errorMsg);
      result.success = false;
    }

    // Set success based on whether there were any errors
    result.success = result.errors.length === 0;

    this.logger.log(
      `Webhook processed: ${result.messagesProcessed} messages, ${result.errors.length} errors`,
    );

    return result;
  }

  /**
   * Process individual webhook entry
   */
  private async processWebhookEntry(entry: WebhookEntry): Promise<WebhookProcessingResult> {
    const result: WebhookProcessingResult = {
      success: true,
      messagesProcessed: 0,
      errors: [],
    };

    // Extract messages from entry
    const messages = this.extractMessagesFromEntry(entry);

    for (const message of messages) {
      try {
        // Authenticate user by phone number
        const authenticatedUser = await this.authService.authenticateByPhone(message.from);

        // Process message through bot service
        const botResult = await this.botService.processMessage(message, authenticatedUser);

        result.messagesProcessed++;

        if (!botResult.success) {
          result.errors.push(`Bot processing failed: ${botResult.error}`);
          result.success = false;
        }
      } catch (error) {
        const errorMsg = `Failed to process message from ${message.from}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.logger.error(errorMsg, error);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Extract messages from webhook entry
   */
  private extractMessagesFromEntry(entry: WebhookEntry): any[] {
    const messages: any[] = [];

    // Navigate through the webhook structure
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.value && change.value.messages) {
        messages.push(...change.value.messages);
      }
    }

    return messages;
  }

  /**
   * Validate webhook payload structure
   */
  private isValidWebhookPayload(payload: any): payload is WebhookPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    if (!Array.isArray(payload.entry)) {
      return false;
    }

    // Basic structure validation
    for (const entry of payload.entry) {
      if (!entry.id || !Array.isArray(entry.changes)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verify webhook signature (for production security)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // In production, implement proper HMAC-SHA256 verification
    // For MVP, we'll implement basic verification
    try {
      // Simple verification for development
      if (!secret) {
        this.logger.warn('Webhook secret not configured - signature verification skipped');
        return true;
      }

      // TODO: Implement proper webhook signature verification
      // const expectedSignature = crypto
      //   .createHmac('sha256', secret)
      //   .update(payload, 'utf8')
      //   .digest('hex');

      // return `sha256=${expectedSignature}` === signature;

      this.logger.log('Webhook signature verification not yet implemented (MVP mode)');
      return true;
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle WhatsApp webhook verification (GET request)
   */
  handleWebhookVerification(
    mode: string,
    token: string,
    challenge: string,
    verifyToken: string,
  ): { verified: boolean; response?: string } {
    try {
      // Verify mode
      if (mode !== 'subscribe') {
        this.logger.warn(`Invalid webhook verification mode: ${mode}`);
        return { verified: false };
      }

      // Verify token
      if (token !== verifyToken) {
        this.logger.warn('Invalid webhook verification token');
        return { verified: false };
      }

      this.logger.log('Webhook verification successful');
      return {
        verified: true,
        response: challenge,
      };
    } catch (error) {
      this.logger.error('Webhook verification failed:', error);
      return { verified: false };
    }
  }

  /**
   * Get webhook processing statistics
   */
  getProcessingStats(): {
    uptime: number;
    messagesProcessed: number;
    errorsCount: number;
    lastProcessedAt?: Date;
  } {
    // In a real implementation, this would track actual statistics
    return {
      uptime: process.uptime(),
      messagesProcessed: 0, // Would be tracked
      errorsCount: 0, // Would be tracked
      lastProcessedAt: new Date(), // Would be tracked
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    status: string;
    authService: boolean;
    botService: boolean;
    whatsAppService: boolean;
  } {
    const authStatus = this.authService.getHealthStatus();
    const whatsAppStatus = this.whatsAppService.getHealthStatus();

    return {
      status: authStatus.status === 'healthy' && whatsAppStatus.status === 'healthy' ? 'healthy' : 'degraded',
      authService: authStatus.status === 'healthy',
      botService: true, // Bot service doesn't have external dependencies to check
      whatsAppService: whatsAppStatus.configured,
    };
  }
}
