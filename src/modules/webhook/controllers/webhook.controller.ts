/**
 * Webhook Controller - WhatsApp Webhook Endpoints
 *
 * Handles incoming WhatsApp Business API webhooks with proper
 * authentication, validation, and error handling.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../services/webhook.service';
import { WebhookPayload } from '../../../types/domain.types';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly verifyToken: string;

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {
    this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN', '');
  }

  /**
   * WhatsApp Webhook Verification (GET)
   * Used by WhatsApp to verify webhook URL during setup
   */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ): string {
    try {
      this.logger.log(`Webhook verification request: mode=${mode}, token=${token ? '***' : 'missing'}`);

      const result = this.webhookService.handleWebhookVerification(
        mode,
        token,
        challenge,
        this.verifyToken,
      );

      if (!result.verified) {
        this.logger.warn('Webhook verification failed');
        throw new BadRequestException('Webhook verification failed');
      }

      this.logger.log('Webhook verification successful');
      return result.response || '';
    } catch (error) {
      this.logger.error('Webhook verification error:', error);
      throw error;
    }
  }

  /**
   * WhatsApp Webhook Handler (POST)
   * Receives incoming messages and other WhatsApp events
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: WebhookPayload,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ status: string; processed: number; errors?: string[] }> {
    try {
      this.logger.log(`Incoming webhook: ${JSON.stringify(payload).length} bytes`);

      // Verify webhook signature in production
      if (signature && !this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid signature');
      }

      // Process webhook
      const result = await this.webhookService.processWebhook(payload);

      const response = {
        status: result.success ? 'success' : 'partial_success',
        processed: result.messagesProcessed,
        ...(result.errors.length > 0 && { errors: result.errors }),
      };

      this.logger.log(
        `Webhook processed: ${result.messagesProcessed} messages, ${result.errors.length} errors`,
      );

      return response;
    } catch (error) {
      this.logger.error('Webhook processing error:', error);

      // Return success to prevent WhatsApp from retrying with invalid payloads
      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        status: 'error',
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Webhook Status Endpoint (GET)
   * Returns processing statistics and health status
   */
  @Get('status')
  getWebhookStatus(): {
    status: string;
    uptime: number;
    messagesProcessed: number;
    errorsCount: number;
    lastProcessedAt?: Date;
    health: any;
  } {
    const stats = this.webhookService.getProcessingStats();
    const health = this.webhookService.getHealthStatus();

    return {
      status: health.status,
      ...stats,
      health,
    };
  }

  /**
   * Test Webhook Endpoint (POST)
   * For testing webhook functionality during development
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() payload: any): Promise<{ status: string; message: string }> {
    try {
      this.logger.log('Test webhook received:', JSON.stringify(payload, null, 2));

      // Basic validation
      if (!payload || typeof payload !== 'object') {
        throw new BadRequestException('Invalid test payload');
      }

      return {
        status: 'success',
        message: 'Test webhook received successfully',
      };
    } catch (error) {
      this.logger.error('Test webhook error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (for production security)
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get<string>('WHATSAPP_WEBHOOK_SECRET', '');

    if (!secret) {
      this.logger.warn('Webhook secret not configured - signature verification skipped');
      return true;
    }

    return this.webhookService.verifyWebhookSignature(payload, signature, secret);
  }
}
