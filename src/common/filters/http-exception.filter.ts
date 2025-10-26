import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter with Hebrew error messages
 * Provides consistent error responses across the application
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get the exception response
    const exceptionResponse = exception.getResponse();
    const errorResponse = this.formatErrorResponse(exceptionResponse, status, request);

    // Log the error
    this.logError(exception, request, status);

    response.status(status).json(errorResponse);
  }

  /**
   * Format error response with Hebrew messages
   */
  private formatErrorResponse(
    exceptionResponse: string | object,
    status: number,
    request: Request,
  ) {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Base error response
    const baseResponse = {
      success: false,
      timestamp,
      path,
      statusCode: status,
    };

    // Handle different types of exception responses
    if (typeof exceptionResponse === 'string') {
      return {
        ...baseResponse,
        error: {
          message: this.translateErrorMessage(exceptionResponse, status),
          code: this.getErrorCode(status),
        },
      };
    }

    // Handle object responses (validation errors, etc.)
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const errorObj = exceptionResponse as any;

      return {
        ...baseResponse,
        error: {
          message: errorObj.message || this.getDefaultErrorMessage(status),
          code: errorObj.code || this.getErrorCode(status),
          details: errorObj.errors || errorObj.details,
        },
      };
    }

    // Fallback
    return {
      ...baseResponse,
      error: {
        message: this.getDefaultErrorMessage(status),
        code: this.getErrorCode(status),
      },
    };
  }

  /**
   * Translate common error messages to Hebrew
   */
  private translateErrorMessage(message: string, status: number): string {
    // Always translate in tests
    const translations: Record<string, string> = {
      'Bad Request': 'בקשה לא תקינה',
      'Unauthorized': 'לא מורשה',
      'Forbidden': 'אסור',
      'Not Found': 'המשאב המבוקש לא נמצא',
      'Method Not Allowed': 'שיטה לא מותרת',
      'Conflict': 'התנגשות',
      'Unprocessable Entity': 'ישות לא ניתנת לעיבוד',
      'Too Many Requests': 'יותר מדי בקשות',
      'Internal Server Error': 'שגיאה פנימית בשרת',
      'Bad Gateway': 'שער לא תקין',
      'Service Unavailable': 'שירות לא זמין',
      'Gateway Timeout': 'תם הזמן לשער',
    };

    return translations[message] || message || this.getDefaultErrorMessage(status);
  }

  /**
   * Get default error message in Hebrew based on status code
   */
  private getDefaultErrorMessage(status: number): string {
    const defaultMessages: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'בקשה לא תקינה',
      [HttpStatus.UNAUTHORIZED]: 'נדרשת הזדהות',
      [HttpStatus.FORBIDDEN]: 'אין הרשאה לביצוע פעולה זו',
      [HttpStatus.NOT_FOUND]: 'המשאב המבוקש לא נמצא',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'שיטת הבקשה לא מותרת',
      [HttpStatus.CONFLICT]: 'התנגשות בנתונים',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'נתונים לא תקינים',
      [HttpStatus.TOO_MANY_REQUESTS]: 'יותר מדי בקשות. נסה שוב מאוחר יותר',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'שגיאה פנימית בשרת',
      [HttpStatus.BAD_GATEWAY]: 'שגיאה בתקשורת עם השרת',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'השירות אינו זמין כעת',
      [HttpStatus.GATEWAY_TIMEOUT]: 'תם הזמן המוקצב לבקשה',
    };

    return defaultMessages[status] || 'שגיאה לא ידועה';
  }

  /**
   * Get error code based on status
   */
  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [HttpStatus.GATEWAY_TIMEOUT]: 'GATEWAY_TIMEOUT',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Log error details for monitoring
   */
  private logError(exception: HttpException, request: Request, status: number) {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    const errorLog = {
      timestamp: new Date().toISOString(),
      method,
      url,
      ip,
      userAgent,
      status,
      error: exception.message,
      stack: exception.stack,
    };

    if (status >= 500) {
      this.logger.error('Server Error', errorLog);
    } else if (status >= 400) {
      this.logger.warn('Client Error', errorLog);
    }
  }
}
