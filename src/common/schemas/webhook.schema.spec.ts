import { ZodError } from 'zod';

import {
  WhatsAppWebhookSchema,
  WebhookVerificationSchema,
  SendTextMessageSchema,
  SendTemplateMessageSchema,
  ProcessedMessageSchema,
  BotResponseSchema,
  ConversationContextSchema,
} from './webhook.schema';

describe('Webhook Schemas', () => {
  describe('WhatsAppWebhookSchema', () => {
    it('should validate valid webhook payload', () => {
      const validData = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+972501234567',
                    phone_number_id: 'phone-id-123',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'message-id-123',
                      timestamp: '1635766800',
                      type: 'text',
                      text: {
                        body: 'שלום עולם',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = WhatsAppWebhookSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate webhook payload with status updates', () => {
      const validData = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+972501234567',
                    phone_number_id: 'phone-id-123',
                  },
                  statuses: [
                    {
                      id: 'status-id-123',
                      status: 'delivered',
                      timestamp: '1635766800',
                      recipient_id: '972509876543',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = WhatsAppWebhookSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid object type', () => {
      const invalidData = {
        object: 'invalid_object',
        entry: [
          {
            id: 'entry-id-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+972501234567',
                    phone_number_id: 'phone-id-123',
                  },
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = WhatsAppWebhookSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Ensure the error has issues and the first issue is what we expect
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['object']);
      }
    });

    it('should reject invalid field type', () => {
      const invalidData = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+972501234567',
                    phone_number_id: 'phone-id-123',
                  },
                },
                field: 'invalid_field',
              },
            ],
          },
        ],
      };

      const result = WhatsAppWebhookSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['entry', 0, 'changes', 0, 'field']);
      }
    });

    it('should reject invalid message format', () => {
      const invalidData = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+972501234567',
                    phone_number_id: 'phone-id-123',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'message-id-123',
                      timestamp: '1635766800',
                      type: 'invalid_type',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = WhatsAppWebhookSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual([
          'entry',
          0,
          'changes',
          0,
          'value',
          'messages',
          0,
          'type',
        ]);
      }
    });
  });

  describe('WebhookVerificationSchema', () => {
    it('should validate valid verification request', () => {
      const validData = {
        'hub.mode': 'subscribe',
        'hub.challenge': '1234567890',
        'hub.verify_token': 'my_webhook_token',
      };

      const result = WebhookVerificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
      const invalidData = {
        'hub.mode': 'invalid_mode',
        'hub.challenge': '1234567890',
        'hub.verify_token': 'my_webhook_token',
      };

      const result = WebhookVerificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['hub.mode']);
      }
    });

    it('should reject missing challenge', () => {
      const invalidData = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'my_webhook_token',
      };

      const result = WebhookVerificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['hub.challenge']);
      }
    });
  });

  describe('SendTextMessageSchema', () => {
    it('should validate valid text message', () => {
      const validData = {
        to: '972501234567',
        text: {
          body: 'שלום עולם',
        },
      };

      const result = SendTextMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          messaging_product: 'whatsapp',
        });
      }
    });

    it('should reject invalid phone number', () => {
      const invalidData = {
        to: 'invalid-phone',
        text: {
          body: 'שלום עולם',
        },
      };

      const result = SendTextMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['to']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('Invalid recipient phone number');
      }
    });

    it('should reject empty message body', () => {
      const invalidData = {
        to: '972501234567',
        text: {
          body: '',
        },
      };

      const result = SendTextMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['text', 'body']);
      }
    });

    it('should reject message body that is too long', () => {
      const invalidData = {
        to: '972501234567',
        text: {
          body: 'א'.repeat(4097), // 4097 characters (exceeds 4096 limit)
        },
      };

      const result = SendTextMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['text', 'body']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('Message body too long');
      }
    });
  });

  describe('SendTemplateMessageSchema', () => {
    it('should validate valid template message', () => {
      const validData = {
        to: '972501234567',
        template: {
          name: 'maintenance_reminder',
          language: {
            code: 'he',
          },
        },
      };

      const result = SendTemplateMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          messaging_product: 'whatsapp',
        });
      }
    });

    it('should validate template with components', () => {
      const validData = {
        to: '972501234567',
        template: {
          name: 'maintenance_reminder',
          language: {
            code: 'he',
          },
          components: [
            {
              type: 'header',
              parameters: [
                {
                  type: 'text',
                  text: 'תזכורת טיפול',
                },
              ],
            },
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: 'אופנוע 12345',
                },
                {
                  type: 'text',
                  text: '15/11/2025',
                },
              ],
            },
          ],
        },
      };

      const result = SendTemplateMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use Hebrew as default language', () => {
      const validData = {
        to: '972501234567',
        template: {
          name: 'maintenance_reminder',
        },
      };

      const result = SendTemplateMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.template.language.code).toBe('he');
      }
    });

    it('should reject invalid component type', () => {
      const invalidData = {
        to: '972501234567',
        template: {
          name: 'maintenance_reminder',
          language: {
            code: 'he',
          },
          components: [
            {
              type: 'invalid_type',
              parameters: [],
            },
          ],
        },
      };

      const result = SendTemplateMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['template', 'components', 0, 'type']);
      }
    });
  });

  describe('ProcessedMessageSchema', () => {
    it('should validate valid processed message', () => {
      const validData = {
        messageId: 'message-id-123',
        from: '972501234567',
        to: '972509876543',
        body: 'שלום עולם',
        timestamp: new Date(),
        type: 'text',
        isFromUser: true,
      };

      const result = ProcessedMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid message type', () => {
      const invalidData = {
        messageId: 'message-id-123',
        from: '972501234567',
        to: '972509876543',
        body: 'שלום עולם',
        timestamp: new Date(),
        type: 'invalid_type',
        isFromUser: true,
      };

      const result = ProcessedMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['type']);
      }
    });
  });

  describe('BotResponseSchema', () => {
    it('should validate valid bot response', () => {
      const validData = {
        to: '972501234567',
        message: 'שלום עולם',
      };

      const result = BotResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          messageType: 'text',
        });
      }
    });

    it('should validate template response', () => {
      const validData = {
        to: '972501234567',
        message: 'שלום עולם',
        messageType: 'template',
        templateName: 'maintenance_reminder',
        templateParams: {
          motorcycle: '12345',
          date: '15/11/2025',
        },
      };

      const result = BotResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject template response without template name', () => {
      const invalidData = {
        to: '972501234567',
        message: 'שלום עולם',
        messageType: 'template',
      };

      const result = BotResponseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['templateName']);
      }
    });
  });

  describe('ConversationContextSchema', () => {
    it('should validate valid conversation context', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        state: 'IDLE',
      };

      const result = ConversationContextSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate context with optional fields', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        state: 'AWAITING_MOTORCYCLE_SELECTION',
        selectedMotorcycleId: '123e4567-e89b-12d3-a456-426614174001',
        pendingMileage: 5000,
        lastMenuSelection: '1',
        errorCount: 0,
        expiresAt: new Date(),
      };

      const result = ConversationContextSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid state', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        state: 'INVALID_STATE',
      };

      const result = ConversationContextSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['state']);
      }
    });

    it('should reject negative error count', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        state: 'IDLE',
        errorCount: -1,
      };

      const result = ConversationContextSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['errorCount']);
      }
    });
  });
});
