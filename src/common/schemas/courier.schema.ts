import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Zod schemas for courier validation with Hebrew error messages
 */

// Base courier schema
export const CourierSchema = z.object({
  userId: z.string().uuid('מזהה משתמש לא תקין'),
  name: z
    .string()
    .min(2, 'שם השליח חייב להכיל לפחות 2 תווים')
    .max(50, 'שם השליח לא יכול להכיל יותר מ-50 תווים')
    .regex(/^[\u0590-\u05FFa-zA-Z\s]+$/, 'שם השליח יכול להכיל רק אותיות בעברית או באנגלית'),
});

// Create courier schema
export const CreateCourierSchema = CourierSchema;

// Update courier schema
export const UpdateCourierSchema = z.object({
  id: z.string().uuid('מזהה שליח לא תקין'),
}).merge(CourierSchema.partial());

// Courier query schema
export const CourierQuerySchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  hasMotorcycles: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Courier statistics schema
export const CourierStatsSchema = z.object({
  courierId: z.string().uuid('מזהה שליח לא תקין'),
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

// Phone number validation for user creation
export const PhoneNumberSchema = z.object({
  phoneNumber: z
    .string()
    .transform((phone) => phone.replace(/\s+/g, '')) // First remove spaces
    .pipe(
      z.string().regex(/^\+972[0-9]{9}$/, 'מספר טלפון לא תקין. פורמט נדרש: +972XXXXXXXXX')
    ),
});

// User creation with courier
export const CreateUserWithCourierSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+972[0-9]{9}$/, 'מספר טלפון לא תקין. פורמט נדרש: +972XXXXXXXXX'),
  courierName: z
    .string()
    .min(2, 'שם השליח חייב להכיל לפחות 2 תווים')
    .max(50, 'שם השליח לא יכול להכיל יותר מ-50 תווים')
    .regex(/^[\u0590-\u05FFa-zA-Z\s]+$/, 'שם השליח יכול להכיל רק אותיות בעברית או באנגלית'),
});

// Mileage report schema
export const MileageReportSchema = z.object({
  motorcycleId: z.string().uuid('מזהה אופנוע לא תקין'),
  mileage: z
    .number()
    .int('קילומטר חייב להיות מספר שלם')
    .min(0, 'קילומטר לא יכול להיות שלילי')
    .max(1000000, 'קילומטר גבוה מדי'),
});

// Courier performance schema
export const CourierPerformanceSchema = z.object({
  courierId: z.string().uuid('מזהה שליח לא תקין'),
  period: z.enum(['week', 'month', 'quarter', 'year'], {
    errorMap: () => ({ message: 'תקופה לא חוקית. אפשרויות: שבוע, חודש, רבעון, שנה' }),
  }),
  year: z.number().int().min(2020).max(2030).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

// Type inference
export type CreateCourierInput = z.infer<typeof CreateCourierSchema>;
export type UpdateCourierInput = z.infer<typeof UpdateCourierSchema>;
export type CourierQueryInput = z.infer<typeof CourierQuerySchema>;
export type CourierStatsInput = z.infer<typeof CourierStatsSchema>;
export type PhoneNumberInput = z.infer<typeof PhoneNumberSchema>;
export type CreateUserWithCourierInput = z.infer<typeof CreateUserWithCourierSchema>;
export type MileageReportInput = z.infer<typeof MileageReportSchema>;
export type CourierPerformanceInput = z.infer<typeof CourierPerformanceSchema>;

// DTOs for NestJS
export class CreateCourierDto extends createZodDto(CreateCourierSchema) {}
export class UpdateCourierDto extends createZodDto(UpdateCourierSchema) {}
export class CourierQueryDto extends createZodDto(CourierQuerySchema) {}
export class CourierStatsDto extends createZodDto(CourierStatsSchema) {}
export class PhoneNumberDto extends createZodDto(PhoneNumberSchema) {}
export class CreateUserWithCourierDto extends createZodDto(CreateUserWithCourierSchema) {}
export class MileageReportDto extends createZodDto(MileageReportSchema) {}
export class CourierPerformanceDto extends createZodDto(CourierPerformanceSchema) {}
