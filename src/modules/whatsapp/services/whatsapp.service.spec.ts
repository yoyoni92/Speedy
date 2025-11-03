/**
 * WhatsApp Service - Unit Tests
 *
 * Comprehensive tests for WhatsApp API integration with mock responses
 * and Hebrew message formatting.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { WhatsAppService, WhatsAppMessage } from './whatsapp.service';
import { MessageFormatterService } from './message-formatter.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let httpService: any;
  let configService: any;
  let messageFormatter: any;

  const mockConfig: Record<string, string> = {
    WHATSAPP_API_URL: 'https://graph.facebook.com/v18.0',
    WHATSAPP_ACCESS_TOKEN: 'mock_token',
    WHATSAPP_PHONE_NUMBER_ID: 'mock_phone_id',
  };

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => mockConfig[key]),
    };

    const mockMessageFormatter = {
      formatForWhatsApp: jest.fn((text) => text),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MessageFormatterService,
          useValue: mockMessageFormatter,
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    messageFormatter = module.get(MessageFormatterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendTextMessage', () => {
    it('should send text message successfully', async () => {
      const mockResponse = {
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ input: '972501234567', wa_id: '972501234567' }],
          messages: [{ id: 'message_123' }],
        },
      };

      httpService.post.mockReturnValue(of(mockResponse));
      messageFormatter.formatForWhatsApp.mockReturnValue('ברוך הבא');

      const result = await service.sendTextMessage('0501234567', 'ברוך הבא');

      expect(result).toBe('message_123');
      expect(httpService.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/mock_phone_id/messages',
        {
          to: '972501234567',
          type: 'text',
          text: { body: 'ברוך הבא' },
        },
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock_token',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should handle development mode without API credentials', async () => {
      // Mock config to return empty credentials
      configService.get.mockImplementation((key: string) => {
        if (key === 'WHATSAPP_ACCESS_TOKEN') return '';
        if (key === 'WHATSAPP_PHONE_NUMBER_ID') return '';
        return mockConfig[key];
      });

      const result = await service.sendTextMessage('0501234567', 'Test message');

      expect(result).toMatch(/^mock_\d+_[a-z0-9]+$/);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should format phone numbers correctly', async () => {
      const mockResponse = {
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ input: '972501234567', wa_id: '972501234567' }],
          messages: [{ id: 'message_123' }],
        },
      };

      httpService.post.mockReturnValue(of(mockResponse));

      // Test various phone formats
      await service.sendTextMessage('050-123-4567', 'Test');
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ to: '972501234567' }),
        expect.any(Object),
      );

      await service.sendTextMessage('501234567', 'Test');
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ to: '972501234567' }),
        expect.any(Object),
      );
    });

    it('should handle API errors gracefully', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('API Error')));

      await expect(service.sendTextMessage('0501234567', 'Test')).rejects.toThrow(
        'Failed to send WhatsApp message',
      );
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send template message successfully', async () => {
      const mockResponse = {
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ input: '972501234567', wa_id: '972501234567' }],
          messages: [{ id: 'template_123' }],
        },
      };

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await service.sendTemplateMessage(
        '0501234567',
        'welcome_template',
        'he',
        [{ type: 'text', text: 'ישראל' }],
      );

      expect(result).toBe('template_123');
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: '972501234567',
          type: 'template',
          template: {
            name: 'welcome_template',
            language: { code: 'he' },
            components: [{ type: 'text', text: 'ישראל' }],
          },
        }),
        expect.any(Object),
      );
    });

    it('should use default language when not specified', async () => {
      const mockResponse = {
        data: {
          messaging_product: 'whatsapp',
          messages: [{ id: 'template_123' }],
        },
      };

      httpService.post.mockReturnValue(of(mockResponse));

      await service.sendTemplateMessage('0501234567', 'test_template');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          template: expect.objectContaining({
            language: { code: 'he' },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('processIncomingMessage', () => {
    it('should process text message correctly', () => {
      const webhookData = {
        entry: [
          {
            changes: [
              {
                value: {
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
              },
            ],
          },
        ],
      };

      const result = service.processIncomingMessage(webhookData);

      expect(result).toEqual({
        id: 'msg_123',
        from: '972501234567',
        type: 'text',
        timestamp: '1640995200',
        text: { body: 'שלום' },
      });
    });

    it('should process interactive button message', () => {
      const webhookData = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'msg_123',
                      from: '972501234567',
                      type: 'interactive',
                      timestamp: '1640995200',
                      interactive: {
                        type: 'button_reply',
                        button_reply: {
                          id: 'btn_1',
                          title: 'כן',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = service.processIncomingMessage(webhookData);

      expect(result).toEqual({
        id: 'msg_123',
        from: '972501234567',
        type: 'interactive',
        timestamp: '1640995200',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'btn_1',
            title: 'כן',
          },
        },
      });
    });

    it('should return null for empty webhook data', () => {
      const result = service.processIncomingMessage({});
      expect(result).toBeNull();
    });

    it('should return null for webhook without messages', () => {
      const webhookData = {
        entry: [
          {
            changes: [
              {
                value: {},
              },
            ],
          },
        ],
      };

      const result = service.processIncomingMessage(webhookData);
      expect(result).toBeNull();
    });

    it('should handle malformed webhook data gracefully', () => {
      const result = service.processIncomingMessage(null as any);
      expect(result).toBeNull();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for MVP mode', () => {
      const result = service.verifyWebhookSignature('payload', 'signature');
      expect(result).toBe(true);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when configured', () => {
      const result = service.getHealthStatus();
      expect(result).toEqual({
        status: 'healthy',
        configured: true,
      });
    });

    it('should return development status when not configured', () => {
      configService.get.mockImplementation(() => '');
      const result = service.getHealthStatus();
      expect(result).toEqual({
        status: 'development',
        configured: false,
      });
    });
  });
});
