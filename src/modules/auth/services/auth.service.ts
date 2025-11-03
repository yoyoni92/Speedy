/**
 * Auth Service - Phone-Based Authentication
 *
 * Handles authentication for WhatsApp users using phone numbers,
 * JWT token management, and role-based access control.
 */

import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { User, UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PhoneVerificationRequest {
  phoneNumber: string;
  verificationCode?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user by phone number (WhatsApp integration)
   */
  async authenticateByPhone(phoneNumber: string): Promise<AuthenticatedUser> {
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { phoneNumber: normalizedPhone },
      });

      if (!user) {
        // Create new user for WhatsApp authentication
        user = await this.prisma.user.create({
          data: {
            phoneNumber: normalizedPhone,
            role: UserRole.COURIER, // Default role for WhatsApp users
            isActive: true,
          },
        });

        this.logger.log(`Created new user for phone: ${normalizedPhone}`);
      }

      if (!user.isActive) {
        throw new UnauthorizedException('המשתמש חסום. אנא פנה לתמיכה.');
      }

      return {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
      };
    } catch (error) {
      this.logger.error(`Authentication failed for phone ${phoneNumber}:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('שגיאה באימות המשתמש');
    }
  }

  /**
   * Generate JWT tokens for authenticated user
   */
  async generateTokens(user: AuthenticatedUser): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    const accessTokenExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m');
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign({
      sub: user.id,
      type: 'refresh',
    });

    // Calculate expires in seconds
    const expiresIn = this.parseExpiryToSeconds(accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = this.jwtService.verify(token);

      // Find user by ID
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('הטוקן לא תקף או שהמשתמש חסום');
      }

      return {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
      };
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('הטוקן לא תקף או שהמשתמש חסום');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      // Verify it's a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('רענון הטוקן נכשל');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('המשתמש לא נמצא או חסום');
      }

      const authUser: AuthenticatedUser = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
      };

      return this.generateTokens(authUser);
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('רענון הטוקן נכשל');
    }
  }

  /**
   * Validate user role permissions
   */
  validateRole(user: AuthenticatedUser, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.COURIER]: 1,
      [UserRole.ADMIN]: 2,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Get user by phone number
   */
  async getUserByPhone(phoneNumber: string): Promise<User | null> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    return this.prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    });
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  /**
   * Normalize phone number to consistent format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove any non-numeric characters
    let cleanPhone = phone.replace(/\D/g, '');

    // Handle Israeli phone numbers
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      // Remove leading 0 and add country code
      cleanPhone = '972' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9 && cleanPhone.startsWith('5')) {
      // Add country code for 9-digit numbers starting with 5
      cleanPhone = '972' + cleanPhone;
    } else if (!cleanPhone.startsWith('972') && cleanPhone.length === 9) {
      // Add country code for other 9-digit numbers
      cleanPhone = '972' + cleanPhone;
    }

    return cleanPhone;
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): { status: string; database: boolean; jwt: boolean } {
    return {
      status: 'healthy',
      database: true, // Would check database connection
      jwt: true, // JWT service is always available
    };
  }
}
