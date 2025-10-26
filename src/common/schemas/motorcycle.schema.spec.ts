import { ZodError } from 'zod';

import {
  CreateMotorcycleSchema,
  UpdateMotorcycleSchema,
  UpdateMileageSchema,
  MotorcycleQuerySchema,
  AssignMotorcycleSchema,
  MaintenanceRecordSchema,
} from './motorcycle.schema';

describe('Motorcycle Schemas', () => {
  describe('CreateMotorcycleSchema', () => {
    it('should validate valid motorcycle data', () => {
      const validData = {
        licensePlate: '12345678',
        type: '125',
        currentMileage: 5000,
        licenseExpiryDate: '2026-12-31',
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
      };

      const result = CreateMotorcycleSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          licenseExpiryDate: new Date('2026-12-31'),
          insuranceExpiryDate: new Date('2026-06-30'),
        });
      }
    });

    it('should validate motorcycle with optional fields', () => {
      const validData = {
        licensePlate: '12345678',
        type: '250',
        currentMileage: 5000,
        licenseExpiryDate: '2026-12-31',
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'ANY_DRIVER',
        assignedCourierId: '123e4567-e89b-12d3-a456-426614174000',
        assignedClientId: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = CreateMotorcycleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid license plate (too short)', () => {
      const invalidData = {
        licensePlate: '1234',
        type: '125',
        currentMileage: 5000,
        licenseExpiryDate: '2026-12-31',
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
      };

      const result = CreateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Ensure the error has issues and the first issue is what we expect
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['licensePlate']);
        expect(result.error.issues[0]?.message).toContain('לפחות 5 תווים');
      }
    });

    it('should reject invalid license plate (non-numeric)', () => {
      const invalidData = {
        licensePlate: '1234ABC',
        type: '125',
        currentMileage: 5000,
        licenseExpiryDate: '2026-12-31',
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
      };

      const result = CreateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['licensePlate']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('ספרות בלבד');
      }
    });

    it('should reject invalid motorcycle type', () => {
      const invalidData = {
        licensePlate: '12345678',
        type: 'INVALID',
        currentMileage: 5000,
        licenseExpiryDate: '2026-12-31',
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
      };

      const result = CreateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['type']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('סוג אופנוע לא חוקי');
      }
    });

    it('should reject negative mileage', () => {
      const invalidData = {
        licensePlate: '12345678',
        type: '125',
        currentMileage: -100,
        licenseExpiryDate: '2026-12-31',
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
      };

      const result = CreateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['currentMileage']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('לא יכול להיות שלילי');
      }
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        licensePlate: '12345678',
        type: '125',
        currentMileage: 5000,
        licenseExpiryDate: '31-12-2026', // Wrong format
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
      };

      const result = CreateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['licenseExpiryDate']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('תאריך לא תקין');
      }
    });

    it('should reject past expiry date', () => {
      const invalidData = {
        licensePlate: '12345678',
        type: '125',
        currentMileage: 5000,
        licenseExpiryDate: '2020-12-31', // Past date
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
      };

      const result = CreateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['licenseExpiryDate']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('חייב להיות בעתיד');
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        licensePlate: '12345678',
        type: '125',
        currentMileage: 5000,
        licenseExpiryDate: '2026-12-31',
        insuranceExpiryDate: '2026-06-30',
        insuranceType: 'SINGLE_DRIVER',
        assignedCourierId: 'invalid-uuid',
      };

      const result = CreateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['assignedCourierId']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('מזהה שליח לא תקין');
      }
    });
  });

  describe('UpdateMotorcycleSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        currentMileage: 6000,
      };

      const result = UpdateMotorcycleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject update without ID', () => {
      const invalidData = {
        currentMileage: 6000,
      };

      const result = UpdateMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['id']);
      }
    });
  });

  describe('UpdateMileageSchema', () => {
    it('should validate valid mileage update', () => {
      const validData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        mileage: 6000,
      };

      const result = UpdateMileageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative mileage', () => {
      const invalidData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        mileage: -100,
      };

      const result = UpdateMileageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['mileage']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('לא יכול להיות שלילי');
      }
    });
  });

  describe('MotorcycleQuerySchema', () => {
    it('should validate query with defaults', () => {
      const validData = {};

      const result = MotorcycleQuerySchema.safeParse(validData);
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

      const result = MotorcycleQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate query with filters', () => {
      const validData = {
        licensePlate: '12345678',
        type: '125',
        courierId: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
      };

      const result = MotorcycleQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          page: 1,
          limit: 10,
        });
      }
    });

    it('should reject invalid motorcycle type in query', () => {
      const invalidData = {
        type: 'INVALID',
      };

      const result = MotorcycleQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('AssignMotorcycleSchema', () => {
    it('should validate assignment with courier', () => {
      const validData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        courierId: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = AssignMotorcycleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate assignment with client', () => {
      const validData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        clientId: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = AssignMotorcycleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate assignment with both courier and client', () => {
      const validData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        courierId: '123e4567-e89b-12d3-a456-426614174001',
        clientId: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = AssignMotorcycleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject assignment without courier or client', () => {
      const invalidData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = AssignMotorcycleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('חייב לציין לפחות שליח או לקוח להקצאה');
      }
    });
  });

  describe('MaintenanceRecordSchema', () => {
    it('should validate valid maintenance record', () => {
      const validData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        maintenanceType: 'SMALL',
        mileageAtMaintenance: 5000,
      };

      const result = MaintenanceRecordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate maintenance record with notes', () => {
      const validData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        maintenanceType: 'LARGE',
        mileageAtMaintenance: 10000,
        notes: 'החלפת שמן ופילטר',
      };

      const result = MaintenanceRecordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid maintenance type', () => {
      const invalidData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        maintenanceType: 'MEDIUM', // Invalid type
        mileageAtMaintenance: 5000,
      };

      const result = MaintenanceRecordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['maintenanceType']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('סוג טיפול לא חוקי');
      }
    });

    it('should reject negative mileage', () => {
      const invalidData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        maintenanceType: 'SMALL',
        mileageAtMaintenance: -100,
      };

      const result = MaintenanceRecordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['mileageAtMaintenance']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('לא יכול להיות שלילי');
      }
    });

    it('should reject notes that are too long', () => {
      const invalidData = {
        motorcycleId: '123e4567-e89b-12d3-a456-426614174000',
        maintenanceType: 'SMALL',
        mileageAtMaintenance: 5000,
        notes: 'א'.repeat(501), // 501 characters
      };

      const result = MaintenanceRecordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.path).toEqual(['notes']);
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]?.message).toContain('לא יכולות להכיל יותר מ-500 תווים');
      }
    });
  });
});
