import { ZodError } from 'zod';

/**
 * Helper function to safely access Zod error issues for testing
 * This helps avoid TypeScript errors while still providing good test coverage
 */
export function expectZodError(result: { success: false; error: ZodError }, callback: (error: ZodError) => void): void {
  // @ts-ignore - We know this is a ZodError in tests
  callback(result.error);
}
