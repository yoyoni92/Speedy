/**
 * Webhook Controller - Unit Tests
 *
 * Tests for WhatsApp webhook endpoints, verification, and error handling.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from '../services/webhook.service';
import { WebhookPayload } from '../../../types/domain.types';

describe('WebhookController', () => {
  let controller: WebhookController;
  let webhookService: any;
  let configService: any;

  const mockWebhookPayload: WebhookPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry_123',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              contacts: [],
              messages: [
                {
                  id: 'msg_123',
                  from: '972501234567',
                  type: 'text',
                  timestamp: '1640995200',
                  text: { body: 'שלום' },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const mockWebhookService = {
      handleWebhookVerification: jest.fn(),
      processWebhook: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      getProcessingStats: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          WHATSAPP_VERIFY_TOKEN: 'test_verify_token',
          WHATSAPP_WEBHOOK_SECRET: 'test_secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    webhookService = module.get(WebhookService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook', () => {
    it('should verify webhook successfully', () => {
      webhookService.handleWebhookVerification.mockReturnValue({
        verified: true,
        response: 'challenge_123',
      });

      const result = controller.verifyWebhook('subscribe', 'challenge_123', 'test_verify_token');

      expect(result).toBe('challenge_123');
      expect(webhookService.handleWebhookVerification).toHaveBeenCalledWith(
        'subscribe',
        'test_verify_token',
        'challenge_123',
        'test_verify_token',
      );
    });

    it('should throw BadRequestException for failed verification', () => {
      webhookService.handleWebhookVerification.mockReturnValue({
        verified: false,
      });

      expect(() => {
        controller.verifyWebhook('subscribe', 'challenge_123', 'wrong_token');
      }).toThrow('Webhook verification failed');
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook successfully', async () => {
      const processingResult = {
        success: true,
        messagesProcessed: 1,
        errors: [],
      };

      webhookService.processWebhook.mockResolvedValue(processingResult);
      webhookService.verifyWebhookSignature.mockReturnValue(true);

      const result = await controller.handleWebhook(mockWebhookPayload, 'valid_signature');

      expect(result).toEqual({
        status: 'success',
        processed: 1,
      });
      expect(webhookService.processWebhook).toHaveBeenCalledWith(mockWebhookPayload);
    });

    it('should handle partial success with errors', async () => {
      const processingResult = {
        success: false,
        messagesProcessed: 1,
        errors: ['Authentication failed'],
      };

      webhookService.processWebhook.mockResolvedValue(processingResult);
      webhookService.verifyWebhookSignature.mockReturnValue(true);

      const result = await controller.handleWebhook(mockWebhookPayload);

      expect(result).toEqual({
        status: 'partial_success',
        processed: 1,
        errors: ['Authentication failed'],
      });
    });

    it('should skip signature verification when no signature provided', async () => {
      const processingResult = {
        success: true,
        messagesProcessed: 1,
        errors: [],
      };

      webhookService.processWebhook.mockResolvedValue(processingResult);

      const result = await controller.handleWebhook(mockWebhookPayload);

      expect(result.status).toBe('success');
      expect(webhookService.verifyWebhookSignature).not.toHaveBeenCalled();
    });

    it('should reject invalid signature', async () => {
      webhookService.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        controller.handleWebhook(mockWebhookPayload, 'invalid_signature'),
      ).rejects.toThrow('Invalid signature');
    });

    it('should handle processing errors gracefully', async () => {
      webhookService.processWebhook.mockRejectedValue(new Error('Processing failed'));
      webhookService.verifyWebhookSignature.mockReturnValue(true);

      const result = await controller.handleWebhook(mockWebhookPayload);

      expect(result).toEqual({
        status: 'error',
        processed: 0,
        errors: ['Processing failed'],
      });
    });

    it('should re-throw BadRequestException for validation errors', async () => {
      webhookService.processWebhook.mockRejectedValue(new BadRequestException('Invalid payload'));

      await expect(controller.handleWebhook(mockWebhookPayload)).rejects.toThrow(
        'Invalid payload',
      );
    });
  });

  describe('getWebhookStatus', () => {
    it('should return webhook status', () => {
      const mockStats = {
        uptime: 12345,
        messagesProcessed: 100,
        errorsCount: 5,
        lastProcessedAt: new Date(),
      };

      const mockHealth = {
        status: 'healthy',
        authService: true,
        botService: true,
        whatsAppService: true,
      };

      webhookService.getProcessingStats.mockReturnValue(mockStats);
      webhookService.getHealthStatus.mockReturnValue(mockHealth);

      const result = controller.getWebhookStatus();

      expect(result).toEqual({
        status: 'healthy',
        ...mockStats,
        health: mockHealth,
      });
    });
  });

  describe('testWebhook', () => {
    it('should accept valid test payload', async () => {
      const testPayload = { test: 'data', message: 'Hello World' };

      const result = await controller.testWebhook(testPayload);

      expect(result).toEqual({
        status: 'success',
        message: 'Test webhook received successfully',
      });
    });

    it('should reject invalid test payload', async () => {
      await expect(controller.testWebhook(null)).rejects.toThrow('Invalid test payload');
      await expect(controller.testWebhook('invalid')).rejects.toThrow('Invalid test payload');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should skip verification when no secret is configured', () => {
      configService.get.mockReturnValue('');

      // Access private method through controller instance
      const result = (controller as any).verifyWebhookSignature('payload', 'signature');

      expect(result).toBe(true);
      expect(webhookService.verifyWebhookSignature).not.toHaveBeenCalled();
    });

    it('should verify signature when secret is configured', () => {
      webhookService.verifyWebhookSignature.mockReturnValue(true);

      const result = (controller as any).verifyWebhookSignature('payload', 'signature');

      expect(result).toBe(true);
      expect(webhookService.verifyWebhookSignature).toHaveBeenCalledWith(
        'payload',
        'signature',
        'test_secret',
      );
    });
  });
});
