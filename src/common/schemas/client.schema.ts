import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Zod schemas for client validation with Hebrew error messages
 */

// Base client schema
export const ClientSchema = z.object({
  name: z
    .string()
    .min(2, 'שם הלקוח חייב להכיל לפחות 2 תווים')
    .max(100, 'שם הלקוח לא יכול להכיל יותר מ-100 תווים')
    .regex(/^[\u0590-\u05FFa-zA-Z0-9\s\-\.]+$/, 'שם הלקוח יכול להכיל אותיות, מספרים, רווחים, מקפים ונקודות'),
});

// Create client schema
export const CreateClientSchema = ClientSchema;

// Update client schema
export const UpdateClientSchema = z.object({
  id: z.string().uuid('מזהה לקוח לא תקין'),
}).merge(ClientSchema.partial());

// Client query schema
export const ClientQuerySchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  hasMotorcycles: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Client statistics schema
export const ClientStatsSchema = z.object({
  clientId: z.string().uuid('מזהה לקוח לא תקין'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך התחלה לא תקין. פורמט נדרש: YYYY-MM-DD')
    .transform((str) => new Date(str)),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך סיום לא תקין. פורמט נדרש: YYYY-MM-DD')
    .transform((str) => new Date(str)),
}).refine(
  (data) => data.endDate >= data.startDate,
  'תאריך סיום חייב להיות אחרי תאריך התחלה'
);

// Client fleet overview schema
export const ClientFleetSchema = z.object({
  clientId: z.string().uuid('מזהה לקוח לא תקין'),
  includeInactive: z.boolean().default(false),
  motorcycleType: z.enum(['125', '250', 'ELECTRIC']).optional(),
});

// Client maintenance report schema
export const ClientMaintenanceReportSchema = z.object({
  clientId: z.string().uuid('מזהה לקוח לא תקין'),
  period: z.enum(['week', 'month', 'quarter', 'year'], {
    errorMap: () => ({ message: 'תקופה לא חוקית. אפשרויות: שבוע, חודש, רבעון, שנה' }),
  }),
  year: z.number().int().min(2020).max(2030).optional(),
  month: z.number().int().min(1).max(12).optional(),
  maintenanceType: z.enum(['SMALL', 'LARGE']).optional(),
});

// Bulk operations schema
export const BulkClientOperationSchema = z.object({
  clientIds: z
    .array(z.string().uuid('מזהה לקוח לא תקין'))
    .min(1, 'חייב לציין לפחות לקוח אחד')
    .max(50, 'לא ניתן לבצע פעולה על יותר מ-50 לקוחות בבת אחת'),
  operation: z.enum(['activate', 'deactivate', 'delete'], {
    errorMap: () => ({ message: 'פעולה לא חוקית. אפשרויות: הפעלה, השבתה, מחיקה' }),
  }),
});

// Client contact information schema (for future use)
export const ClientContactSchema = z.object({
  clientId: z.string().uuid('מזהה לקוח לא תקין'),
  contactName: z
    .string()
    .min(2, 'שם איש קשר חייב להכיל לפחות 2 תווים')
    .max(50, 'שם איש קשר לא יכול להכיל יותר מ-50 תווים'),
  phoneNumber: z
    .string()
    .regex(/^\+972[0-9]{9}$/, 'מספר טלפון לא תקין. פורמט נדרש: +972XXXXXXXXX')
    .optional(),
  email: z
    .string()
    .email('כתובת אימייל לא תקינה')
    .optional(),
}).refine(
  (data) => data.phoneNumber || data.email,
  'חייב לציין לפחות טלפון או אימייל'
);

// Type inference
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type ClientQueryInput = z.infer<typeof ClientQuerySchema>;
export type ClientStatsInput = z.infer<typeof ClientStatsSchema>;
export type ClientFleetInput = z.infer<typeof ClientFleetSchema>;
export type ClientMaintenanceReportInput = z.infer<typeof ClientMaintenanceReportSchema>;
export type BulkClientOperationInput = z.infer<typeof BulkClientOperationSchema>;
export type ClientContactInput = z.infer<typeof ClientContactSchema>;

// DTOs for NestJS
export class CreateClientDto extends createZodDto(CreateClientSchema) {}
export class UpdateClientDto extends createZodDto(UpdateClientSchema) {}
export class ClientQueryDto extends createZodDto(ClientQuerySchema) {}
export class ClientStatsDto extends createZodDto(ClientStatsSchema) {}
export class ClientFleetDto extends createZodDto(ClientFleetSchema) {}
export class ClientMaintenanceReportDto extends createZodDto(ClientMaintenanceReportSchema) {}
export class BulkClientOperationDto extends createZodDto(BulkClientOperationSchema) {}
export class ClientContactDto extends createZodDto(ClientContactSchema) {}
