import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Zod schemas for WhatsApp webhook validation
 */

// WhatsApp message schema
export const WhatsAppMessageSchema = z.object({
  from: z.string().regex(/^\d{10,15}$/, 'Invalid phone number format'),
  id: z.string().min(1, 'Message ID is required'),
  timestamp: z.string().regex(/^\d{10}$/, 'Invalid timestamp format'),
  type: z.enum(['text', 'image', 'document', 'audio', 'video']),
  text: z
    .object({
      body: z.string().max(4096, 'Message too long'),
    })
    .optional(),
  image: z
    .object({
      id: z.string(),
      mime_type: z.string(),
      sha256: z.string(),
    })
    .optional(),
  document: z
    .object({
      id: z.string(),
      filename: z.string().optional(),
      mime_type: z.string(),
      sha256: z.string(),
    })
    .optional(),
});

// WhatsApp contact schema
export const WhatsAppContactSchema = z.object({
  profile: z.object({
    name: z.string(),
  }),
  wa_id: z.string().regex(/^\d{10,15}$/, 'Invalid WhatsApp ID format'),
});

// WhatsApp status schema
export const WhatsAppStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  timestamp: z.string().regex(/^\d{10}$/, 'Invalid timestamp format'),
  recipient_id: z.string().regex(/^\d{10,15}$/, 'Invalid recipient ID format'),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string(),
        message: z.string().optional(),
      })
    )
    .optional(),
});

// WhatsApp metadata schema
export const WhatsAppMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

// WhatsApp value schema
export const WhatsAppValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: WhatsAppMetadataSchema,
  contacts: z.array(WhatsAppContactSchema).optional(),
  messages: z.array(WhatsAppMessageSchema).optional(),
  statuses: z.array(WhatsAppStatusSchema).optional(),
});

// WhatsApp change schema
export const WhatsAppChangeSchema = z.object({
  value: WhatsAppValueSchema,
  field: z.literal('messages'),
});

// WhatsApp entry schema
export const WhatsAppEntrySchema = z.object({
  id: z.string(),
  changes: z.array(WhatsAppChangeSchema),
});

// Main webhook payload schema
export const WhatsAppWebhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(WhatsAppEntrySchema),
});

// Webhook verification schema
export const WebhookVerificationSchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.challenge': z.string(),
  'hub.verify_token': z.string(),
});

// Outgoing message schemas
export const SendTextMessageSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Invalid recipient phone number'),
  text: z.object({
    body: z.string().min(1).max(4096, 'Message body too long'),
  }),
  messaging_product: z.literal('whatsapp').default('whatsapp'),
});

export const SendTemplateMessageSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Invalid recipient phone number'),
  template: z.object({
    name: z.string().min(1, 'Template name is required'),
    language: z.object({
      code: z.string(),
    }).default({ code: 'he' }), // Hebrew by default
    components: z
      .array(
        z.object({
          type: z.enum(['header', 'body', 'footer']),
          parameters: z
            .array(
              z.object({
                type: z.enum(['text', 'currency', 'date_time']),
                text: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
  }),
  messaging_product: z.literal('whatsapp').default('whatsapp'),
});

// Message processing schemas
export const ProcessedMessageSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  to: z.string(),
  body: z.string(),
  timestamp: z.date(),
  type: z.enum(['text', 'image', 'document', 'audio', 'video']),
  isFromUser: z.boolean(),
});

// Bot response schema
export const BotResponseSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Invalid recipient phone number'),
  message: z.string().min(1).max(4096, 'Response message too long'),
  messageType: z.enum(['text', 'template']).default('text'),
  templateName: z.string().optional(),
  templateParams: z.record(z.string()).optional(),
}).refine(
  (data) => {
    // If messageType is 'template', templateName is required
    return data.messageType !== 'template' || (data.templateName && data.templateName.length > 0);
  },
  {
    message: 'Template name is required when message type is template',
    path: ['templateName'],
  }
);

// Conversation context schema
export const ConversationContextSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  state: z.enum([
    'IDLE',
    'AWAITING_MENU_SELECTION',
    'AWAITING_MOTORCYCLE_SELECTION',
    'AWAITING_MILEAGE_INPUT',
    'AWAITING_MOTORCYCLE_DATA',
    'AWAITING_CONFIRMATION',
  ]),
  selectedMotorcycleId: z.string().uuid().optional(),
  pendingMileage: z.number().int().min(0).optional(),
  lastMenuSelection: z.string().optional(),
  errorCount: z.number().int().min(0).default(0),
  expiresAt: z.date().optional(),
});

// Error response schema
export const WebhookErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
  timestamp: z.date().default(() => new Date()),
  requestId: z.string().optional(),
});

// Type inference
export type WhatsAppWebhookPayload = z.infer<typeof WhatsAppWebhookSchema>;
export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;
export type WhatsAppContact = z.infer<typeof WhatsAppContactSchema>;
export type WhatsAppStatus = z.infer<typeof WhatsAppStatusSchema>;
export type WebhookVerificationInput = z.infer<typeof WebhookVerificationSchema>;
export type SendTextMessageInput = z.infer<typeof SendTextMessageSchema>;
export type SendTemplateMessageInput = z.infer<typeof SendTemplateMessageSchema>;
export type ProcessedMessage = z.infer<typeof ProcessedMessageSchema>;
export type BotResponse = z.infer<typeof BotResponseSchema>;
export type ConversationContext = z.infer<typeof ConversationContextSchema>;
export type WebhookError = z.infer<typeof WebhookErrorSchema>;

// DTOs for NestJS
export class WhatsAppWebhookDto extends createZodDto(WhatsAppWebhookSchema) {}
export class WebhookVerificationDto extends createZodDto(WebhookVerificationSchema) {}
export class SendTextMessageDto extends createZodDto(SendTextMessageSchema) {}
export class SendTemplateMessageDto extends createZodDto(SendTemplateMessageSchema) {}
export class ProcessedMessageDto extends createZodDto(ProcessedMessageSchema) {}
export class BotResponseDto extends createZodDto(BotResponseSchema) {}
export class ConversationContextDto extends createZodDto(ConversationContextSchema) {}
export class WebhookErrorDto extends createZodDto(WebhookErrorSchema) {}
