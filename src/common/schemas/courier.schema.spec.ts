import { ZodError } from 'zod';

import {
  CreateCourierSchema,
  UpdateCourierSchema,
  CourierQuerySchema,
  CourierStatsSchema,
  PhoneNumberSchema,
  CreateUserWithCourierSchema,
  MileageReportSchema,
} from './courier.schema';

describe('Courier Schemas', () => {
  describe('CreateCourierSchema', () => {
    it('should validate valid courier data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'יוסי כהן',
      };

      const result = CreateCourierSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject name that is too short', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'י',
      };

      const result = CreateCourierSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Ensure the error has issues and the first issue is what we expect
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['name']);
        expect(result.error.issues[0]?.message).toContain('לפחות 2 תווים');
      }
    });

    it('should reject name with invalid characters', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'יוסי כהן123!@#', // Contains numbers and special characters
      };

      const result = CreateCourierSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['name']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('יכול להכיל רק אותיות');
      }
    });

    it('should reject invalid user ID format', () => {
      const invalidData = {
        userId: 'invalid-uuid',
        name: 'יוסי כהן',
      };

      const result = CreateCourierSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['userId']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('מזהה משתמש לא תקין');
      }
    });

    it('should accept mixed Hebrew and English name', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'יוסי Cohen',
      };

      const result = CreateCourierSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateCourierSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'יוסי לוי',
      };

      const result = UpdateCourierSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject update without ID', () => {
      const invalidData = {
        name: 'יוסי לוי',
      };

      const result = UpdateCourierSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['id']);
      }
    });

    it('should allow partial updates', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = UpdateCourierSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('CourierQuerySchema', () => {
    it('should validate query with defaults', () => {
      const validData = {};

      const result = CourierQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 1,
          limit: 10,
        });
      }
    });

    it('should validate query with custom pagination', () => {
      const validData = {
        page: 2,
        limit: 20,
      };

      const result = CourierQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate query with filters', () => {
      const validData = {
        name: 'יוסי',
        isActive: true,
        hasMotorcycles: true,
      };

      const result = CourierQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          page: 1,
          limit: 10,
        });
      }
    });
  });

  describe('CourierStatsSchema', () => {
    it('should validate valid date range', () => {
      const validData = {
        courierId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      const result = CourierStatsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
        });
      }
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        courierId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '01/01/2025', // Wrong format
        endDate: '2025-12-31',
      };

      const result = CourierStatsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['startDate']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('תאריך התחלה לא תקין');
      }
    });

    it('should reject end date before start date', () => {
      const invalidData = {
        courierId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2025-12-31',
        endDate: '2025-01-01', // Before start date
      };

      const result = CourierStatsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('תאריך סיום חייב להיות אחרי תאריך התחלה');
      }
    });
  });

  describe('PhoneNumberSchema', () => {
    it('should validate valid Israeli phone number', () => {
      const validData = {
        phoneNumber: '+972501234567',
      };

      const result = PhoneNumberSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number format', () => {
      const invalidData = {
        phoneNumber: '0501234567', // Missing +972 prefix
      };

      const result = PhoneNumberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['phoneNumber']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('מספר טלפון לא תקין');
      }
    });

    it('should remove spaces from phone number', () => {
      const validData = {
        phoneNumber: '+972 50 123 4567', // With spaces
      };

      const result = PhoneNumberSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          phoneNumber: '+972501234567', // Spaces removed
        });
      }
    });
  });

  describe('CreateUserWithCourierSchema', () => {
    it('should validate valid user with courier data', () => {
      const validData = {
        phoneNumber: '+972501234567',
        courierName: 'יוסי כהן',
      };

      const result = CreateUserWithCourierSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const invalidData = {
        phoneNumber: 'invalid-phone',
        courierName: 'יוסי כהן',
      };

      const result = CreateUserWithCourierSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['phoneNumber']);
      }
    });

    it('should reject invalid courier name', () => {
      const invalidData = {
        phoneNumber: '+972501234567',
        courierName: 'י', // Too short
      };

      const result = CreateUserWithCourierSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['courierName']);
      }
    });
  });

  describe('MileageReportSchema', () => {
    it('should validate valid mileage report', () => {
      const validData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        mileage: 5000,
      };

      const result = MileageReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative mileage', () => {
      const invalidData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        mileage: -100,
      };

      const result = MileageReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['mileage']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('לא יכול להיות שלילי');
      }
    });

    it('should reject invalid motorcycle ID', () => {
      const invalidData = {
        motorcycleId: 'invalid-uuid',
        mileage: 5000,
      };

      const result = MileageReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['motorcycleId']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('מזהה אופנוע לא תקין');
      }
    });
  });
});
