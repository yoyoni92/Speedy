/**
 * Central export file for all type definitions
 * Provides a single import point for domain types throughout the application
 */

// Re-export all domain types
export * from './domain.types';

// Re-export Prisma generated types for convenience
export {
  User,
  Client,
  Courier,
  Motorcycle,
  MaintenanceHistory,
  MileageReport,
  Conversation,
  UserRole,
  MotorcycleType,
  InsuranceType,
  MaintenanceType,
  ConversationState,
  Prisma,
} from '@prisma/client';
