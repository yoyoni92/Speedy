/**
 * Domain types for the Speedy Fleet Management System
 * These types define the core business entities and their relationships
 */

import {
  UserRole,
  MotorcycleType,
  InsuranceType,
  MaintenanceType,
  ConversationState
} from '@prisma/client';

// Re-export Prisma enums for use throughout the application
export { UserRole, MotorcycleType, InsuranceType, MaintenanceType, ConversationState };

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  courier?: CourierInfo;
}

export interface CourierInfo {
  id: string;
  name: string;
  isActive: boolean;
}

// =============================================================================
// FLEET MANAGEMENT
// =============================================================================

export interface MotorcycleInfo {
  id: string;
  licensePlate: string;
  type: MotorcycleType;
  currentMileage: number;
  licenseExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceType: InsuranceType;
  isActive: boolean;
  assignedCourier?: CourierInfo;
  assignedClient?: ClientInfo;
}

export interface ClientInfo {
  id: string;
  name: string;
  isActive: boolean;
}

export interface MaintenanceRecord {
  id: string;
  motorcycleId: string;
  maintenanceType: MaintenanceType;
  mileageAtMaintenance: number;
  performedAt: Date;
  notes?: string;
}

export interface MileageReportInfo {
  id: string;
  motorcycleId: string;
  courierId: string;
  mileage: number;
  reportedAt: Date;
}

// =============================================================================
// MAINTENANCE CALCULATIONS
// =============================================================================

export interface MaintenanceCalculationResult {
  type: MaintenanceType;
  nextMileage: number | null;
  dueIn: number | null;
  intervalKm: number;
  cyclePosition: number;
  isOverdue?: boolean;
}

export interface MaintenanceSchedule {
  motorcycle: MotorcycleInfo;
  nextMaintenance: MaintenanceCalculationResult;
  history: MaintenanceRecord[];
  recommendations?: string[];
}

// =============================================================================
// CONVERSATION & BOT
// =============================================================================

export interface ConversationContext {
  selectedMotorcycleId?: string;
  pendingMileage?: number;
  lastMenuSelection?: string;
  errorCount?: number;
  [key: string]: any;
}

export interface ConversationInfo {
  id: string;
  userId: string;
  state: ConversationState;
  context?: ConversationContext;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// WHATSAPP INTEGRATION
// =============================================================================

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  messageId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'document';
}

export interface WhatsAppWebhookPayload {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
  object: string;
}

export interface ProcessMessageInput {
  user: AuthenticatedUser;
  message: WhatsAppMessage;
  conversation?: ConversationInfo;
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// HEBREW TEXT FORMATTING
// =============================================================================

export interface HebrewTextOptions {
  rtl?: boolean;
  includeDirectionMarkers?: boolean;
  formatNumbers?: boolean;
}

export interface MenuOption {
  key: string;
  label: string;
  description?: string;
  isEnabled?: boolean;
}

export interface TextMenu {
  title: string;
  options: MenuOption[];
  footer?: string;
  allowBack?: boolean;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface BusinessError {
  code: string;
  message: string;
  userMessage?: string; // Hebrew message for users
  context?: Record<string, any>;
}

export enum ErrorCodes {
  // Authentication
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Fleet Management
  MOTORCYCLE_NOT_FOUND = 'MOTORCYCLE_NOT_FOUND',
  COURIER_NOT_ASSIGNED = 'COURIER_NOT_ASSIGNED',
  INVALID_MILEAGE = 'INVALID_MILEAGE',
  
  // Maintenance
  MAINTENANCE_CALCULATION_ERROR = 'MAINTENANCE_CALCULATION_ERROR',
  INVALID_MAINTENANCE_TYPE = 'INVALID_MAINTENANCE_TYPE',
  
  // Conversation
  CONVERSATION_EXPIRED = 'CONVERSATION_EXPIRED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  
  // WhatsApp
  WEBHOOK_VERIFICATION_FAILED = 'WEBHOOK_VERIFICATION_FAILED',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  
  // General
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type CreateMotorcycleInput = Omit<
  MotorcycleInfo,
  'id' | 'isActive' | 'assignedCourier' | 'assignedClient'
> & {
  assignedCourierId?: string;
  assignedClientId?: string;
};

export type UpdateMotorcycleInput = Partial<CreateMotorcycleInput> & {
  id: string;
};

export type CreateCourierInput = Omit<CourierInfo, 'id' | 'isActive'> & {
  userId: string;
};

export type UpdateCourierInput = Partial<CreateCourierInput> & {
  id: string;
};

export type CreateClientInput = Omit<ClientInfo, 'id' | 'isActive'>;

export type UpdateClientInput = Partial<CreateClientInput> & {
  id: string;
};

export type ReportMileageInput = {
  motorcycleId: string;
  mileage: number;
  courierId: string;
};

export type RecordMaintenanceInput = {
  motorcycleId: string;
  maintenanceType: MaintenanceType;
  mileageAtMaintenance: number;
  notes?: string;
};
