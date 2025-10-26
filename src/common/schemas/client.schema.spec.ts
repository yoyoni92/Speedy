import { ZodError } from 'zod';

import {
  CreateClientSchema,
  UpdateClientSchema,
  ClientQuerySchema,
  ClientStatsSchema,
  ClientFleetSchema,
  ClientMaintenanceReportSchema,
  BulkClientOperationSchema,
  ClientContactSchema,
} from './client.schema';

describe('Client Schemas', () => {
  describe('CreateClientSchema', () => {
    it('should validate valid client data', () => {
      const validData = {
        name: 'חברת הובלות ירושלים',
      };

      const result = CreateClientSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject name that is too short', () => {
      const invalidData = {
        name: 'א',
      };

      const result = CreateClientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Ensure the error has issues and the first issue is what we expect
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['name']);
        expect(result.error.issues[0]?.message).toContain('לפחות 2 תווים');
      }
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        name: 'א'.repeat(101), // 101 characters
      };

      const result = CreateClientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['name']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('לא יכול להכיל יותר מ-100 תווים');
      }
    });

    it('should accept name with valid special characters', () => {
      const validData = {
        name: 'חברת הובלות ירושלים - סניף מרכז',
      };

      const result = CreateClientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject name with invalid special characters', () => {
      const invalidData = {
        name: 'חברת הובלות ירושלים @#$%^&*()',
      };

      const result = CreateClientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['name']);
      }
    });
  });

  describe('UpdateClientSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'חברת הובלות תל אביב',
      };

      const result = UpdateClientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject update without ID', () => {
      const invalidData = {
        name: 'חברת הובלות תל אביב',
      };

      const result = UpdateClientSchema.safeParse(invalidData);
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

      const result = UpdateClientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid ID format', () => {
      const invalidData = {
        id: 'invalid-uuid',
        name: 'חברת הובלות תל אביב',
      };

      const result = UpdateClientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['id']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('מזהה לקוח לא תקין');
      }
    });
  });

  describe('ClientQuerySchema', () => {
    it('should validate query with defaults', () => {
      const validData = {};

      const result = ClientQuerySchema.safeParse(validData);
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

      const result = ClientQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate query with filters', () => {
      const validData = {
        name: 'הובלות',
        isActive: true,
        hasMotorcycles: true,
      };

      const result = ClientQuerySchema.safeParse(validData);
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

  describe('ClientStatsSchema', () => {
    it('should validate valid date range', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      const result = ClientStatsSchema.safeParse(validData);
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
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '01/01/2025', // Wrong format
        endDate: '2025-12-31',
      };

      const result = ClientStatsSchema.safeParse(invalidData);
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
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2025-12-31',
        endDate: '2025-01-01', // Before start date
      };

      const result = ClientStatsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('תאריך סיום חייב להיות אחרי תאריך התחלה');
      }
    });
  });

  describe('ClientFleetSchema', () => {
    it('should validate valid fleet query', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = ClientFleetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with optional parameters', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        includeInactive: true,
        motorcycleType: '125',
      };

      const result = ClientFleetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid motorcycle type', () => {
      const invalidData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        motorcycleType: 'INVALID',
      };

      const result = ClientFleetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['motorcycleType']);
      }
    });
  });

  describe('ClientMaintenanceReportSchema', () => {
    it('should validate valid maintenance report query', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        period: 'month',
      };

      const result = ClientMaintenanceReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with optional parameters', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        period: 'year',
        year: 2025,
        month: 10,
        maintenanceType: 'SMALL',
      };

      const result = ClientMaintenanceReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid period', () => {
      const invalidData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        period: 'daily', // Invalid period
      };

      const result = ClientMaintenanceReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['period']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('תקופה לא חוקית');
      }
    });

    it('should reject invalid year', () => {
      const invalidData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        period: 'year',
        year: 2019, // Before min year
      };

      const result = ClientMaintenanceReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['year']);
      }
    });
  });

  describe('BulkClientOperationSchema', () => {
    it('should validate valid bulk operation', () => {
      const validData = {
        clientIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
        operation: 'activate',
      };

      const result = BulkClientOperationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty client IDs array', () => {
      const invalidData = {
        clientIds: [],
        operation: 'activate',
      };

      const result = BulkClientOperationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['clientIds']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('חייב לציין לפחות לקוח אחד');
      }
    });

    it('should reject too many client IDs', () => {
      const invalidData = {
        clientIds: Array(51).fill('123e4567-e89b-12d3-a456-426614174000'),
        operation: 'activate',
      };

      const result = BulkClientOperationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['clientIds']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('לא ניתן לבצע פעולה על יותר מ-50 לקוחות');
      }
    });

    it('should reject invalid operation', () => {
      const invalidData = {
        clientIds: ['123e4567-e89b-12d3-a456-426614174000'],
        operation: 'invalid',
      };

      const result = BulkClientOperationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['operation']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('פעולה לא חוקית');
      }
    });
  });

  describe('ClientContactSchema', () => {
    it('should validate valid contact with phone', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        contactName: 'יוסי כהן',
        phoneNumber: '+972501234567',
      };

      const result = ClientContactSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid contact with email', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        contactName: 'יוסי כהן',
        email: 'yossi@example.com',
      };

      const result = ClientContactSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid contact with both phone and email', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        contactName: 'יוסי כהן',
        phoneNumber: '+972501234567',
        email: 'yossi@example.com',
      };

      const result = ClientContactSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject contact without phone or email', () => {
      const invalidData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        contactName: 'יוסי כהן',
      };

      const result = ClientContactSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('חייב לציין לפחות טלפון או אימייל');
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        contactName: 'יוסי כהן',
        email: 'invalid-email',
      };

      const result = ClientContactSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['email']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('כתובת אימייל לא תקינה');
      }
    });

    it('should reject invalid phone number format', () => {
      const invalidData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        contactName: 'יוסי כהן',
        phoneNumber: '0501234567', // Missing +972 prefix
      };

      const result = ClientContactSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['phoneNumber']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('מספר טלפון לא תקין');
      }
    });
  });
});
