/**
 * Webhook Service - Unit Tests
 *
 * Tests for WhatsApp webhook processing, validation, and bot coordination.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { AuthService } from '../../auth/services/auth.service';
import { BotService } from '../../bot/services/bot.service';
import { WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { WebhookPayload } from '../../../types/domain.types';

describe('WebhookService', () => {
  let service: WebhookService;
  let authService: any;
  let botService: any;
  let whatsAppService: any;

  const mockAuthenticatedUser = {
    id: 'user_123',
    phoneNumber: '972501234567',
    role: 'COURIER' as const,
    isActive: true,
  };

  const mockWhatsAppMessage = {
    id: 'msg_123',
    from: '972501234567',
    type: 'text',
    timestamp: '1640995200',
    text: { body: 'שלום' },
  };

  beforeEach(async () => {
    const mockAuthService = {
      authenticateByPhone: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const mockBotService = {
      processMessage: jest.fn(),
    };

    const mockWhatsAppService = {
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: BotService,
          useValue: mockBotService,
        },
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    authService = module.get(AuthService);
    botService = module.get(BotService);
    whatsAppService = module.get(WhatsAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook', () => {
    it('should process valid webhook payload successfully', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  contacts: [],
                  messages: [mockWhatsAppMessage],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      authService.authenticateByPhone.mockResolvedValue(mockAuthenticatedUser);
      botService.processMessage.mockResolvedValue({
        success: true,
        messageId: 'response_123',
        conversationEnded: false,
      });

      const result = await service.processWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.messagesProcessed).toBe(1);
      expect(result.errors).toHaveLength(0);

      expect(authService.authenticateByPhone).toHaveBeenCalledWith('972501234567');
      expect(botService.processMessage).toHaveBeenCalledWith(mockWhatsAppMessage, mockAuthenticatedUser);
    });

    it('should handle multiple messages in webhook', async () => {
      const payload: WebhookPayload = {
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
                    mockWhatsAppMessage,
                    {
                      ...mockWhatsAppMessage,
                      id: 'msg_456',
                      from: '972509876543',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      authService.authenticateByPhone.mockResolvedValue(mockAuthenticatedUser);
      botService.processMessage.mockResolvedValue({
        success: true,
        messageId: 'response_123',
        conversationEnded: false,
      });

      const result = await service.processWebhook(payload);

      expect(result.messagesProcessed).toBe(2);
      expect(authService.authenticateByPhone).toHaveBeenCalledTimes(2);
      expect(botService.processMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication failures gracefully', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  contacts: [],
                  messages: [mockWhatsAppMessage],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      authService.authenticateByPhone.mockRejectedValue(new Error('Authentication failed'));

      const result = await service.processWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.messagesProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Authentication failed');
    });

    it('should handle bot processing failures gracefully', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  contacts: [],
                  messages: [mockWhatsAppMessage],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      authService.authenticateByPhone.mockResolvedValue(mockAuthenticatedUser);
      botService.processMessage.mockResolvedValue({
        success: false,
        conversationEnded: false,
        error: 'Bot processing failed',
      });

      const result = await service.processWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.messagesProcessed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Bot processing failed');
    });

    it('should reject invalid webhook payload structure', async () => {
      const invalidPayload = {
        object: 'invalid',
        // Missing entry array
      };

      const result = await service.processWebhook(invalidPayload as any);

      expect(result.success).toBe(false);
      expect(result.messagesProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid webhook payload structure');
    });

    it('should handle empty webhook payload', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      const result = await service.processWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.messagesProcessed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle webhook entry without messages', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  contacts: [],
                  // No messages array
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await service.processWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.messagesProcessed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true when no secret is configured', () => {
      const result = service.verifyWebhookSignature('payload', 'signature', '');
      expect(result).toBe(true);
    });

    it('should return true for MVP mode with secret', () => {
      const result = service.verifyWebhookSignature('payload', 'signature', 'secret');
      expect(result).toBe(true);
    });

    it('should handle verification errors gracefully', () => {
      // Test with invalid inputs that might cause errors
      const result = service.verifyWebhookSignature('', '', 'secret');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('handleWebhookVerification', () => {
    it('should verify webhook successfully', () => {
      const result = service.handleWebhookVerification(
        'subscribe',
        'verify_token_123',
        'challenge_456',
        'verify_token_123',
      );

      expect(result.verified).toBe(true);
      expect(result.response).toBe('challenge_456');
    });

    it('should reject invalid mode', () => {
      const result = service.handleWebhookVerification(
        'invalid_mode',
        'verify_token_123',
        'challenge_456',
        'verify_token_123',
      );

      expect(result.verified).toBe(false);
      expect(result.response).toBeUndefined();
    });

    it('should reject invalid token', () => {
      const result = service.handleWebhookVerification(
        'subscribe',
        'wrong_token',
        'challenge_456',
        'verify_token_123',
      );

      expect(result.verified).toBe(false);
      expect(result.response).toBeUndefined();
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing statistics', () => {
      const result = service.getProcessingStats();

      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('messagesProcessed');
      expect(result).toHaveProperty('errorsCount');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all services are healthy', () => {
      authService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      whatsAppService.getHealthStatus.mockReturnValue({ status: 'healthy', configured: true });

      const result = service.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.authService).toBe(true);
      expect(result.botService).toBe(true);
      expect(result.whatsAppService).toBe(true);
    });

    it('should return degraded status when services are unhealthy', () => {
      authService.getHealthStatus.mockReturnValue({ status: 'error' });
      whatsAppService.getHealthStatus.mockReturnValue({ status: 'development', configured: false });

      const result = service.getHealthStatus();

      expect(result.status).toBe('degraded');
      expect(result.authService).toBe(false);
      expect(result.whatsAppService).toBe(false);
    });
  });
});
