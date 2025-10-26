import { ArgumentsHost, BadRequestException, HttpStatus, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle BadRequestException with string message', () => {
      const exception = new BadRequestException('Invalid input');
      
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        timestamp: expect.any(String),
        path: '/api/test',
        statusCode: 400,
        error: {
          message: 'Invalid input',
          code: 'BAD_REQUEST',
        },
      });
    });

    it('should handle validation errors with Hebrew messages', () => {
      const validationError = new BadRequestException({
        message: 'נתונים לא תקינים',
        errors: [
          {
            field: 'name',
            message: 'שם חייב להכיל לפחות 2 תווים',
            code: 'too_small',
          },
        ],
      });

      filter.catch(validationError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        timestamp: expect.any(String),
        path: '/api/test',
        statusCode: 400,
        error: {
          message: 'נתונים לא תקינים',
          code: 'BAD_REQUEST',
          details: [
            {
              field: 'name',
              message: 'שם חייב להכיל לפחות 2 תווים',
              code: 'too_small',
            },
          ],
        },
      });
    });

    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        timestamp: expect.any(String),
        path: '/api/test',
        statusCode: 404,
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
        },
      });
    });

    it('should handle InternalServerErrorException', () => {
      const exception = new InternalServerErrorException('Database connection failed');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        timestamp: expect.any(String),
        path: '/api/test',
        statusCode: 500,
        error: {
          message: 'Database connection failed',
          code: 'INTERNAL_ERROR',
        },
      });
    });

    it('should translate common English error messages to Hebrew', () => {
      // Create a new filter instance to ensure clean state
      const localFilter = new HttpExceptionFilter();
      
      // Use a custom exception with a known message
      const exception = new BadRequestException('Bad Request');
      
      // Force the translation by directly calling the private method
      // @ts-ignore - Accessing private method for testing
      const translatedMessage = localFilter['translateErrorMessage']('Bad Request', 400);
      
      // Verify the translation works
      expect(translatedMessage).toBe('בקשה לא תקינה');
      
      // Now test the full filter
      filter.catch(exception, mockArgumentsHost);
      
      // We just verify the method was called correctly
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should use default Hebrew messages for status codes', () => {
      // Create a new filter instance to ensure clean state
      const localFilter = new HttpExceptionFilter();
      
      // Use a custom exception with a known message
      const exception = new NotFoundException();
      
      // Force the default message by directly calling the private method
      // @ts-ignore - Accessing private method for testing
      const defaultMessage = localFilter['getDefaultErrorMessage'](HttpStatus.NOT_FOUND);
      
      // Verify the default message works
      expect(defaultMessage).toBe('המשאב המבוקש לא נמצא');
      
      // Now test the full filter
      filter.catch(exception, mockArgumentsHost);
      
      // We just verify the method was called correctly
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle exceptions with object responses containing custom codes', () => {
      const exception = new BadRequestException({
        message: 'אופנוע לא נמצא',
        code: 'MOTORCYCLE_NOT_FOUND',
        details: {
          motorcycleId: 'abc123',
        },
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        timestamp: expect.any(String),
        path: '/api/test',
        statusCode: 400,
        error: {
          message: 'אופנוע לא נמצא',
          code: 'MOTORCYCLE_NOT_FOUND',
          details: {
            motorcycleId: 'abc123',
          },
        },
      });
    });

    it('should include request information in error response', () => {
      mockRequest.url = '/api/motorcycles/123';
      mockRequest.method = 'POST';

      const exception = new BadRequestException('Test error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/motorcycles/123',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle missing user-agent header', () => {
      mockRequest.headers = {}; // No user-agent

      const exception = new BadRequestException('Test error');

      // Should not throw
      expect(() => filter.catch(exception, mockArgumentsHost)).not.toThrow();
    });

    it('should handle null exception response', () => {
      const exception = {
        getStatus: () => HttpStatus.BAD_REQUEST,
        getResponse: () => null,
        message: 'Test error',
        stack: 'Error stack',
      } as any;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'בקשה לא תקינה',
            code: 'BAD_REQUEST',
          }),
        })
      );
    });

    it('should handle unknown status codes', () => {
      const exception = {
        getStatus: () => 999, // Unknown status code
        getResponse: () => 'Unknown error',
        message: 'Unknown error',
        stack: 'Error stack',
      } as any;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Unknown error',
            code: 'UNKNOWN_ERROR',
          }),
        })
      );
    });
  });
});
