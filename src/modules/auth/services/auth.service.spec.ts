/**
 * Auth Service - Unit Tests
 *
 * Comprehensive tests for phone-based authentication, JWT token management,
 * and role-based access control.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, AuthenticatedUser } from './auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;
  let configService: any;

  const mockUser = {
    id: 'user_123',
    phoneNumber: '972501234567',
    role: UserRole.COURIER,
    isActive: true,
    name: 'ישראל ישראלי',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          JWT_ACCESS_EXPIRY: '15m',
          JWT_REFRESH_EXPIRY: '7d',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticateByPhone', () => {
    it('should authenticate existing active user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.authenticateByPhone('0501234567');

      expect(result).toEqual({
        id: mockUser.id,
        phoneNumber: mockUser.phoneNumber,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phoneNumber: '972501234567' },
      });
    });

    it('should create new user for unknown phone number', async () => {
      const newUser = { ...mockUser, name: null };
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(newUser);

      const result = await service.authenticateByPhone('0501234567');

      expect(result.role).toBe(UserRole.COURIER);
      expect(result.isActive).toBe(true);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          phoneNumber: '972501234567',
          role: UserRole.COURIER,
          isActive: true,
        },
      });
    });

    it('should normalize phone numbers correctly', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Test various phone formats
      await service.authenticateByPhone('0501234567'); // 050 format
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phoneNumber: '972501234567' },
      });

      await service.authenticateByPhone('501234567'); // 9 digits
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phoneNumber: '972501234567' },
      });

      await service.authenticateByPhone('972501234567'); // Already normalized
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phoneNumber: '972501234567' },
      });
    });

    it('should reject inactive users', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.authenticateByPhone('0501234567')).rejects.toThrow(
        'המשתמש חסום. אנא פנה לתמיכה.',
      );
    });

    it('should handle database errors gracefully', async () => {
      prismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.authenticateByPhone('0501234567')).rejects.toThrow(
        'שגיאה באימות המשתמש',
      );
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const mockTokens = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
      };

      jwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.generateTokens(mockUser as AuthenticatedUser);

      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
      expect(result.expiresIn).toBe(900); // 15 minutes in seconds

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        phoneNumber: mockUser.phoneNumber,
        role: mockUser.role,
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        type: 'refresh',
      });
    });

    it('should use default expiry values', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => defaultValue);

      jwtService.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const result = await service.generateTokens(mockUser as AuthenticatedUser);

      expect(result.expiresIn).toBe(900); // Default 15 minutes
    });
  });

  describe('verifyToken', () => {
    it('should verify and return authenticated user', async () => {
      const token = 'valid_token';
      const payload = {
        sub: mockUser.id,
        phoneNumber: mockUser.phoneNumber,
        role: mockUser.role,
      };

      jwtService.verify.mockReturnValue(payload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.verifyToken(token);

      expect(result).toEqual({
        id: mockUser.id,
        phoneNumber: mockUser.phoneNumber,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
    });

    it('should reject invalid tokens', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyToken('invalid_token')).rejects.toThrow(
        'הטוקן לא תקף',
      );
    });

    it('should reject tokens for inactive users', async () => {
      const payload = { sub: mockUser.id };
      const inactiveUser = { ...mockUser, isActive: false };

      jwtService.verify.mockReturnValue(payload);
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.verifyToken('token')).rejects.toThrow(
        'הטוקן לא תקף או שהמשתמש חסום',
      );
    });

    it('should reject tokens for non-existent users', async () => {
      const payload = { sub: 'non_existent_id' };

      jwtService.verify.mockReturnValue(payload);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyToken('token')).rejects.toThrow(
        'הטוקן לא תקף או שהמשתמש חסום',
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'refresh_token_123';
      const payload = { sub: mockUser.id, type: 'refresh' };
      const newTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 900,
      };

      jwtService.verify.mockReturnValue(payload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock generateTokens
      const generateTokensSpy = jest.spyOn(service, 'generateTokens');
      generateTokensSpy.mockResolvedValue(newTokens);

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual(newTokens);
      expect(generateTokensSpy).toHaveBeenCalledWith({
        id: mockUser.id,
        phoneNumber: mockUser.phoneNumber,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
    });

    it('should reject non-refresh tokens', async () => {
      const payload = { sub: mockUser.id, type: 'access' };
      jwtService.verify.mockReturnValue(payload);

      await expect(service.refreshToken('access_token')).rejects.toThrow(
        'רענון הטוקן נכשל',
      );
    });

    it('should reject invalid refresh tokens', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(
        'רענון הטוקן נכשל',
      );
    });
  });

  describe('validateRole', () => {
    it('should allow courier access to courier resources', () => {
      const user: AuthenticatedUser = { ...mockUser, role: UserRole.COURIER };
      const result = service.validateRole(user, UserRole.COURIER);
      expect(result).toBe(true);
    });

    it('should allow admin access to courier resources', () => {
      const user: AuthenticatedUser = { ...mockUser, role: UserRole.ADMIN };
      const result = service.validateRole(user, UserRole.COURIER);
      expect(result).toBe(true);
    });

    it('should deny courier access to admin resources', () => {
      const user: AuthenticatedUser = { ...mockUser, role: UserRole.COURIER };
      const result = service.validateRole(user, UserRole.ADMIN);
      expect(result).toBe(false);
    });
  });

  describe('getUserByPhone', () => {
    it('should return user by phone number', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserByPhone('0501234567');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phoneNumber: '972501234567' },
      });
    });

    it('should return null for non-existent user', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserByPhone('0501234567');

      expect(result).toBeNull();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const updatedUser = { ...mockUser, role: UserRole.ADMIN };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(mockUser.id, UserRole.ADMIN);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { role: UserRole.ADMIN },
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      prismaService.user.update.mockResolvedValue(deactivatedUser);

      const result = await service.deactivateUser(mockUser.id);

      expect(result.isActive).toBe(false);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: false },
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', () => {
      const result = service.getHealthStatus();
      expect(result).toEqual({
        status: 'healthy',
        database: true,
        jwt: true,
      });
    });
  });
});
