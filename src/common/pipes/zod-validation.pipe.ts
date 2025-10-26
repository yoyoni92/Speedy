import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Custom Zod validation pipe for NestJS
 * Provides Hebrew error messages and detailed validation feedback
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = this.formatZodErrors(error);
        throw new BadRequestException({
          message: 'נתונים לא תקינים',
          errors: formattedErrors,
          statusCode: 400,
        });
      }
      throw new BadRequestException('שגיאה בעיבוד הנתונים');
    }
  }

  /**
   * Format Zod errors into a user-friendly Hebrew format
   */
  private formatZodErrors(error: ZodError): Array<{
    field: string;
    message: string;
    code: string;
  }> {
    return error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }
}

/**
 * Factory function to create Zod validation pipes
 */
export function createZodPipe(schema: ZodSchema) {
  return new ZodValidationPipe(schema);
}
