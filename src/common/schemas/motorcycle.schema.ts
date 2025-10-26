import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Zod schemas for motorcycle validation with Hebrew error messages
 */

// Base motorcycle schema
export const MotorcycleSchema = z.object({
  licensePlate: z
    .string()
    .min(5, 'מספר רישיון חייב להכיל לפחות 5 תווים')
    .max(10, 'מספר רישיון לא יכול להכיל יותר מ-10 תווים')
    .regex(/^[0-9]+$/, 'מספר רישיון חייב להכיל ספרות בלבד'),
  
  type: z.enum(['125', '250', 'ELECTRIC'], {
    errorMap: () => ({ message: 'סוג אופנוע לא חוקי. אפשרויות: 125, 250, חשמלי' }),
  }),
  
  currentMileage: z
    .number()
    .int('קילומטר חייב להיות מספר שלם')
    .min(0, 'קילומטר לא יכול להיות שלילי')
    .max(1000000, 'קילומטר גבוה מדי (מעל מיליון)'),
  
  licenseExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין. פורמט נדרש: YYYY-MM-DD')
    .transform((str) => new Date(str))
    .refine((date) => date > new Date(), 'תאריך תפוגת רישיון חייב להיות בעתיד'),
  
  insuranceExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין. פורמט נדרש: YYYY-MM-DD')
    .transform((str) => new Date(str))
    .refine((date) => date > new Date(), 'תאריך תפוגת ביטוח חייב להיות בעתיד'),
  
  insuranceType: z.enum(['SINGLE_DRIVER', 'ANY_DRIVER'], {
    errorMap: () => ({ message: 'סוג ביטוח לא חוקי. אפשרויות: נהג יחיד, כל נהג' }),
  }),
  
  assignedCourierId: z.string().uuid('מזהה שליח לא תקין').optional(),
  assignedClientId: z.string().uuid('מזהה לקוח לא תקין').optional(),
});

// Create motorcycle schema (without ID)
export const CreateMotorcycleSchema = MotorcycleSchema;

// Update motorcycle schema (partial with ID)
export const UpdateMotorcycleSchema = z.object({
  id: z.string().uuid('מזהה אופנוע לא תקין'),
}).merge(MotorcycleSchema.partial());

// Mileage update schema
export const UpdateMileageSchema = z.object({
  motorcycleId: z.string().uuid('מזהה אופנוע לא תקין'),
  mileage: z
    .number()
    .int('קילומטר חייב להיות מספר שלם')
    .min(0, 'קילומטר לא יכול להיות שלילי')
    .max(1000000, 'קילומטר גבוה מדי'),
});

// Motorcycle query schema
export const MotorcycleQuerySchema = z.object({
  licensePlate: z.string().optional(),
  type: z.enum(['125', '250', 'ELECTRIC']).optional(),
  courierId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Assignment schema
export const AssignMotorcycleSchema = z.object({
  motorcycleId: z.string().uuid('מזהה אופנוע לא תקין'),
  courierId: z.string().uuid('מזהה שליח לא תקין').optional(),
  clientId: z.string().uuid('מזהה לקוח לא תקין').optional(),
}).refine(
  (data) => data.courierId || data.clientId,
  'חייב לציין לפחות שליח או לקוח להקצאה'
);

// Maintenance record schema
export const MaintenanceRecordSchema = z.object({
  motorcycleId: z.string().uuid('מזהה אופנוע לא תקין'),
  maintenanceType: z.enum(['SMALL', 'LARGE'], {
    errorMap: () => ({ message: 'סוג טיפול לא חוקי. אפשרויות: קטן, גדול' }),
  }),
  mileageAtMaintenance: z
    .number()
    .int('קילומטר בטיפול חייב להיות מספר שלם')
    .min(0, 'קילומטר בטיפול לא יכול להיות שלילי'),
  notes: z.string().max(500, 'הערות לא יכולות להכיל יותר מ-500 תווים').optional(),
});

// Type inference
export type CreateMotorcycleInput = z.infer<typeof CreateMotorcycleSchema>;
export type UpdateMotorcycleInput = z.infer<typeof UpdateMotorcycleSchema>;
export type UpdateMileageInput = z.infer<typeof UpdateMileageSchema>;
export type MotorcycleQueryInput = z.infer<typeof MotorcycleQuerySchema>;
export type AssignMotorcycleInput = z.infer<typeof AssignMotorcycleSchema>;
export type MaintenanceRecordInput = z.infer<typeof MaintenanceRecordSchema>;

// DTOs for NestJS
export class CreateMotorcycleDto extends createZodDto(CreateMotorcycleSchema) {}
export class UpdateMotorcycleDto extends createZodDto(UpdateMotorcycleSchema) {}
export class UpdateMileageDto extends createZodDto(UpdateMileageSchema) {}
export class MotorcycleQueryDto extends createZodDto(MotorcycleQuerySchema) {}
export class AssignMotorcycleDto extends createZodDto(AssignMotorcycleSchema) {}
export class MaintenanceRecordDto extends createZodDto(MaintenanceRecordSchema) {}
