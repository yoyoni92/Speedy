import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe, createZodPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;
  let testSchema: z.ZodSchema;

  beforeEach(() => {
    testSchema = z.object({
      name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
      age: z.number().int().min(0, 'גיל חייב להיות חיובי'),
      email: z.string().email('כתובת אימייל לא תקינה'),
    });
    pipe = new ZodValidationPipe(testSchema);
  });

  describe('transform', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: Object,
      data: '',
    };

    it('should pass valid data through unchanged', () => {
      const validData = {
        name: 'יוסי כהן',
        age: 25,
        email: 'yossi@example.com',
      };

      const result = pipe.transform(validData, metadata);

      expect(result).toEqual(validData);
    });

    it('should throw BadRequestException for invalid data', () => {
      const invalidData = {
        name: 'א', // Too short
        age: -5, // Negative
        email: 'invalid-email', // Invalid format
      };

      expect(() => pipe.transform(invalidData, metadata)).toThrow(BadRequestException);
    });

    it('should format Zod errors with Hebrew messages', () => {
      const invalidData = {
        name: 'א',
        age: -5,
        email: 'invalid-email',
      };

      try {
        pipe.transform(invalidData, metadata);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toEqual({
          message: 'נתונים לא תקינים',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'שם חייב להכיל לפחות 2 תווים',
              code: 'too_small',
            }),
            expect.objectContaining({
              field: 'age',
              message: 'גיל חייב להיות חיובי',
              code: 'too_small',
            }),
            expect.objectContaining({
              field: 'email',
              message: 'כתובת אימייל לא תקינה',
              code: 'invalid_string',
            }),
          ]),
          statusCode: 400,
        });
      }
    });

    it('should handle nested object validation', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
          profile: z.object({
            age: z.number().min(0, 'גיל חייב להיות חיובי'),
          }),
        }),
      });

      const nestedPipe = new ZodValidationPipe(nestedSchema);
      const invalidNestedData = {
        user: {
          name: 'א',
          profile: {
            age: -1,
          },
        },
      };

      try {
        nestedPipe.transform(invalidNestedData, metadata);
        fail('Should have thrown an error');
      } catch (error) {
        // getResponse can be string or an object; ensure we extract errors safely
        const response = (error as BadRequestException).getResponse();
        const errors =
          typeof response === 'object' && response !== null && 'errors' in response
            ? (response as any).errors
            : undefined;
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'user.name',
              message: 'שם חייב להכיל לפחות 2 תווים',
            }),
            expect.objectContaining({
              field: 'user.profile.age',
              message: 'גיל חייב להיות חיובי',
            }),
          ])
        );
      }
    });

    it('should handle array validation errors', () => {
      const arraySchema = z.object({
        items: z.array(
          z.object({
            name: z.string().min(1, 'שם פריט נדרש'),
          })
        ),
      });

      const arrayPipe = new ZodValidationPipe(arraySchema);
      const invalidArrayData = {
        items: [{ name: 'תקין' }, { name: '' }, { name: 'תקין גם' }],
      };

      try {
        arrayPipe.transform(invalidArrayData, metadata);
        fail('Should have thrown an error');
      } catch (error) {
        const response = (error as BadRequestException).getResponse();
        const errors =
          typeof response === 'object' && response !== null && 'errors' in response
            ? (response as any).errors
            : undefined;
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'items.1.name',
              message: 'שם פריט נדרש',
            }),
          ])
        );
      }
    });

    it('should handle missing required fields', () => {
      const incompleteData = {
        name: 'יוסי כהן',
        // Missing age and email
      };

      try {
        pipe.transform(incompleteData, metadata);
        fail('Should have thrown an error');
      } catch (error) {
        const response = (error as BadRequestException).getResponse();
        const errors =
          typeof response === 'object' && response !== null && 'errors' in response
            ? (response as any).errors
            : undefined;
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              code: 'invalid_type',
            }),
            expect.objectContaining({
              field: 'email',
              code: 'invalid_type',
            }),
          ])
        );
      }
    });

    it('should handle non-ZodError exceptions', () => {
      const faultySchema = {
        parse: () => {
          throw new Error('Generic error');
        },
      } as any;

      const faultyPipe = new ZodValidationPipe(faultySchema);

      expect(() => faultyPipe.transform({}, metadata)).toThrow(
        new BadRequestException('שגיאה בעיבוד הנתונים')
      );
    });
  });

  describe('createZodPipe factory', () => {
    it('should create a ZodValidationPipe instance', () => {
      const schema = z.object({ test: z.string() });
      const createdPipe = createZodPipe(schema);

      expect(createdPipe).toBeInstanceOf(ZodValidationPipe);
    });

    it('should work with the created pipe', () => {
      const schema = z.object({
        message: z.string().min(1, 'הודעה נדרשת'),
      });
      const createdPipe = createZodPipe(schema);
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Object,
        data: '',
      };

      const validData = { message: 'שלום עולם' };
      const result = createdPipe.transform(validData, metadata);

      expect(result).toEqual(validData);
    });
  });
});
