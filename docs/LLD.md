# Speedy - Low-Level Design Document

**Project:** Speedy Fleet Management System  
**Date:** October 22, 2025  
**Author:** Software Architect  
**Based On:** BRD v1.1, HLD  
**Status:** Ready for Implementation

---

## Executive Summary

This Low-Level Design document provides detailed implementation specifications for the Speedy MVP, including:
- Complete API contracts and interfaces
- Detailed database schema with Prisma
- Bot conversation state machine implementation
- Service layer architecture
- Text-based WhatsApp integration patterns
- Step-by-step implementation guide

**Key Implementation Decisions:**
- **NestJS** with TypeScript for type-safe development
- **Text-based WhatsApp** interface for rapid MVP deployment
- **Prisma ORM** with PostgreSQL for type-safe database operations
- **Zod schemas** for runtime validation and type inference
- **Envalid** for environment configuration
- **Render** for hosting with free PostgreSQL

---

## Table of Contents

1. [Database Schema Design](#1-database-schema-design)
2. [API Contracts & Interfaces](#2-api-contracts--interfaces)
3. [Bot State Machine Design](#3-bot-state-machine-design)
4. [Service Layer Architecture](#4-service-layer-architecture)
5. [WhatsApp Integration Layer](#5-whatsapp-integration-layer)
6. [Validation & Error Handling](#6-validation--error-handling)
7. [Configuration Management](#7-configuration-management)
8. [Testing Strategy](#8-testing-strategy)
9. [Implementation Plan](#9-implementation-plan)

---

## 1. Database Schema Design

### 1.1 Complete Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
enum UserRole {
  ADMIN
  COURIER
}

enum MotorcycleType {
  ONE_TWENTY_FIVE  // 125cc
  TWO_FIFTY        // 250cc
  ELECTRIC
}

enum InsuranceType {
  SINGLE_DRIVER
  ANY_DRIVER
}

enum MaintenanceType {
  SMALL
  LARGE
  NONE
}

enum ConversationState {
  IDLE
  AWAITING_MENU_SELECTION
  AWAITING_MOTORCYCLE_SELECTION
  AWAITING_MILEAGE_INPUT
  AWAITING_MOTORCYCLE_DATA_LICENSE_PLATE
  AWAITING_MOTORCYCLE_DATA_TYPE
  AWAITING_MOTORCYCLE_DATA_LICENSE_EXPIRY
  AWAITING_MOTORCYCLE_DATA_INSURANCE_EXPIRY
  AWAITING_MOTORCYCLE_DATA_INSURANCE_TYPE
  AWAITING_MOTORCYCLE_DATA_CURRENT_MILEAGE
  AWAITING_MOTORCYCLE_DATA_COURIER_ASSIGNMENT
  CONFIRMING_MOTORCYCLE_CREATION
}

// Core Entities
model User {
  id                String    @id @default(uuid())
  phoneNumber       String    @unique @map("phone_number")
  role              UserRole  @default(COURIER)
  linkedCourierId   String?   @map("linked_courier_id")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Relations
  linkedCourier     Courier?  @relation(fields: [linkedCourierId], references: [id])
  conversationState ConversationState?

  @@map("users")
}

model Client {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  couriers    Courier[]
  motorcycles Motorcycle[]

  @@map("clients")
}

model Courier {
  id          String   @id @default(uuid())
  name        String
  phoneNumber String   @unique @map("phone_number")
  clientId    String?  @map("client_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  client         Client?         @relation(fields: [clientId], references: [id])
  user           User?
  motorcycles    Motorcycle[]
  mileageReports MileageReport[]

  @@map("couriers")
}

model Motorcycle {
  id                     String          @id @default(uuid())
  licensePlate           String          @unique @map("license_plate")
  type                   MotorcycleType
  model                  String?
  year                   Int?
  licenseExpiryDate      DateTime        @map("license_expiry_date") @db.Date
  insuranceExpiryDate    DateTime        @map("insurance_expiry_date") @db.Date
  insuranceType          InsuranceType   @map("insurance_type")
  currentMileage         Int             @default(0) @map("current_mileage")
  nextMaintenanceMileage Int?            @map("next_maintenance_mileage")
  nextMaintenanceType    MaintenanceType? @map("next_maintenance_type")
  assignedCourierId      String?         @map("assigned_courier_id")
  assignedClientId       String?         @map("assigned_client_id")
  createdAt              DateTime        @default(now()) @map("created_at")
  updatedAt              DateTime        @updatedAt @map("updated_at")

  // Relations
  assignedCourier   Courier?            @relation(fields: [assignedCourierId], references: [id])
  assignedClient    Client?             @relation(fields: [assignedClientId], references: [id])
  mileageReports    MileageReport[]
  maintenanceHistory MaintenanceHistory[]

  // Constraints
  @@check(currentMileage >= 0, map: "chk_current_mileage_positive")
  @@check(year == null || (year >= 2000 && year <= 2100), map: "chk_year_valid")
  @@map("motorcycles")
}

model MileageReport {
  id              String     @id @default(uuid())
  motorcycleId    String     @map("motorcycle_id")
  courierId       String     @map("courier_id")
  reportedMileage Int        @map("reported_mileage")
  reportedAt      DateTime   @default(now()) @map("reported_at")

  // Relations
  motorcycle Motorcycle @relation(fields: [motorcycleId], references: [id])
  courier    Courier    @relation(fields: [courierId], references: [id])

  // Constraints
  @@check(reportedMileage >= 0, map: "chk_reported_mileage_positive")
  @@map("mileage_reports")
}

model MaintenanceHistory {
  id                    String          @id @default(uuid())
  motorcycleId          String          @map("motorcycle_id")
  maintenanceType       MaintenanceType @map("maintenance_type")
  mileageAtMaintenance  Int             @map("mileage_at_maintenance")
  performedDate         DateTime        @map("performed_date") @db.Date
  notes                 String?
  createdAt             DateTime        @default(now()) @map("created_at")

  // Relations
  motorcycle Motorcycle @relation(fields: [motorcycleId], references: [id])

  // Constraints
  @@check(mileageAtMaintenance >= 0, map: "chk_maintenance_mileage_positive")
  @@map("maintenance_history")
}

model ConversationState {
  id           String                    @id @default(uuid())
  userPhone    String                    @unique @map("user_phone")
  state        ConversationState         @default(IDLE)
  context      Json?                     // Store conversation context as JSON
  lastActivity DateTime                  @default(now()) @map("last_activity")
  expiresAt    DateTime?                 @map("expires_at")

  // Relations
  user User @relation(fields: [userPhone], references: [phoneNumber])

  @@map("conversation_states")
}

// Indexes for performance
// Note: Prisma automatically creates indexes for @unique and foreign keys
// Additional indexes for query optimization:
// CREATE INDEX idx_motorcycles_next_maintenance ON motorcycles(next_maintenance_mileage);
// CREATE INDEX idx_mileage_reports_date ON mileage_reports(reported_at);
// CREATE INDEX idx_maintenance_history_date ON maintenance_history(performed_date);
// CREATE INDEX idx_conversation_states_expiry ON conversation_states(expires_at);
```

### 1.2 Database Indexes Strategy

```sql
-- Additional performance indexes (run after migration)
CREATE INDEX CONCURRENTLY idx_motorcycles_next_maintenance 
  ON motorcycles(next_maintenance_mileage) 
  WHERE next_maintenance_mileage IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_mileage_reports_date 
  ON mileage_reports(reported_at DESC);

CREATE INDEX CONCURRENTLY idx_maintenance_history_date 
  ON maintenance_history(performed_date DESC);

CREATE INDEX CONCURRENTLY idx_conversation_states_expiry 
  ON conversation_states(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_motorcycles_type_mileage 
  ON motorcycles(type, current_mileage);
```

### 1.3 Sample Data Seed

```typescript
// prisma/seed.ts
import { PrismaClient, UserRole, MotorcycleType, InsuranceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      phoneNumber: '+972501234567',
      role: UserRole.ADMIN,
    },
  });

  // Create client
  const client = await prisma.client.create({
    data: {
      name: 'חברת משלוחים מהירים',
    },
  });

  // Create couriers
  const couriers = await Promise.all([
    prisma.courier.create({
      data: {
        name: 'מתן כהן',
        phoneNumber: '+972507390520',
        clientId: client.id,
        user: {
          create: {
            phoneNumber: '+972507390520',
            role: UserRole.COURIER,
          },
        },
      },
    }),
    prisma.courier.create({
      data: {
        name: 'אלון לוי',
        phoneNumber: '+972508123456',
        clientId: client.id,
        user: {
          create: {
            phoneNumber: '+972508123456',
            role: UserRole.COURIER,
          },
        },
      },
    }),
  ]);

  // Create motorcycles
  await Promise.all([
    prisma.motorcycle.create({
      data: {
        licensePlate: '488162',
        type: MotorcycleType.ONE_TWENTY_FIVE,
        model: 'Honda PCX',
        year: 2023,
        licenseExpiryDate: new Date('2026-01-15'),
        insuranceExpiryDate: new Date('2026-04-30'),
        insuranceType: InsuranceType.ANY_DRIVER,
        currentMileage: 32800,
        nextMaintenanceMileage: 36000,
        nextMaintenanceType: 'LARGE',
        assignedCourierId: couriers[0].id,
        assignedClientId: client.id,
      },
    }),
    prisma.motorcycle.create({
      data: {
        licensePlate: '494631',
        type: MotorcycleType.TWO_FIFTY,
        model: 'Yamaha XMAX',
        year: 2022,
        licenseExpiryDate: new Date('2025-12-20'),
        insuranceExpiryDate: new Date('2025-11-15'),
        insuranceType: InsuranceType.SINGLE_DRIVER,
        currentMileage: 15200,
        nextMaintenanceMileage: 20000,
        nextMaintenanceType: 'LARGE',
        assignedCourierId: couriers[1].id,
        assignedClientId: client.id,
      },
    }),
  ]);

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 2. API Contracts & Interfaces

### 2.1 Core Domain Types

```typescript
// src/types/domain.types.ts
export interface AuthenticatedUser {
  id: string;
  phoneNumber: string;
  role: 'ADMIN' | 'COURIER';
  linkedCourierId?: string;
  courierName?: string;
}

export interface MotorcycleWithRelations {
  id: string;
  licensePlate: string;
  type: 'ONE_TWENTY_FIVE' | 'TWO_FIFTY' | 'ELECTRIC';
  model?: string;
  year?: number;
  licenseExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceType: 'SINGLE_DRIVER' | 'ANY_DRIVER';
  currentMileage: number;
  nextMaintenanceMileage?: number;
  nextMaintenanceType?: 'SMALL' | 'LARGE' | 'NONE';
  assignedCourier?: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  assignedClient?: {
    id: string;
    name: string;
  };
}

export interface MaintenanceCalculationResult {
  type: 'SMALL' | 'LARGE' | 'NONE';
  nextMileage: number | null;
  dueIn: number | null;
  intervalKm: number;
  cyclePosition: number;
}

export interface ConversationContext {
  userId: string;
  state: ConversationState;
  data: Record<string, any>;
  lastActivity: Date;
  expiresAt?: Date;
}

export interface WhatsAppMessage {
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

export interface ProcessMessageInput {
  messageId: string;
  from: string;
  text: string;
  type: string;
  user: AuthenticatedUser;
}
```

### 2.2 Zod Validation Schemas

```typescript
// src/common/schemas/motorcycle.schema.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Phone number validation
export const phoneNumberSchema = z.string()
  .regex(/^\+972[0-9]{9}$/, 'מספר טלפון חייב להיות בפורמט +972XXXXXXXXX');

// Motorcycle schemas
export const CreateMotorcycleSchema = z.object({
  licensePlate: z.string()
    .min(5, 'מספר רישיון קצר מדי')
    .max(10, 'מספר רישיון ארוך מדי')
    .regex(/^\d+$/, 'מספר רישיון חייב להכיל ספרות בלבד'),
  
  type: z.enum(['ONE_TWENTY_FIVE', 'TWO_FIFTY', 'ELECTRIC'], {
    errorMap: () => ({ message: 'סוג אופנוע לא חוקי' })
  }),
  
  model: z.string().optional(),
  
  year: z.number()
    .int('שנה חייבת להיות מספר שלם')
    .min(2000, 'שנה לא יכולה להיות לפני 2000')
    .max(2100, 'שנה לא יכולה להיות אחרי 2100')
    .optional(),
  
  licenseExpiryDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין')
    .transform((str) => new Date(str)),
  
  insuranceExpiryDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין')
    .transform((str) => new Date(str)),
  
  insuranceType: z.enum(['SINGLE_DRIVER', 'ANY_DRIVER']),
  
  currentMileage: z.number()
    .int('קילומטר חייב להיות מספר שלם')
    .min(0, 'קילומטר לא יכול להיות שלילי')
    .max(1000000, 'קילומטר גבוה מדי'),
  
  assignedCourierId: z.string().uuid().optional(),
  assignedClientId: z.string().uuid().optional(),
});

export const UpdateMotorcycleSchema = CreateMotorcycleSchema.partial();

export const ReportMileageSchema = z.object({
  motorcycleId: z.string().uuid('מזהה אופנוע לא תקין'),
  mileage: z.number()
    .int('קילומטר חייב להיות מספר שלם')
    .min(0, 'קילומטר לא יכול להיות שלילי')
    .max(1000000, 'קילומטר גבוה מדי'),
});

// Generate DTOs
export class CreateMotorcycleDto extends createZodDto(CreateMotorcycleSchema) {}
export class UpdateMotorcycleDto extends createZodDto(UpdateMotorcycleSchema) {}
export class ReportMileageDto extends createZodDto(ReportMileageSchema) {}

// Courier schemas
export const CreateCourierSchema = z.object({
  name: z.string()
    .min(2, 'שם קצר מדי')
    .max(50, 'שם ארוך מדי'),
  
  phoneNumber: phoneNumberSchema,
  
  clientId: z.string().uuid().optional(),
});

export class CreateCourierDto extends createZodDto(CreateCourierSchema) {}

// Client schemas
export const CreateClientSchema = z.object({
  name: z.string()
    .min(2, 'שם לקוח קצר מדי')
    .max(100, 'שם לקוח ארוך מדי'),
});

export class CreateClientDto extends createZodDto(CreateClientSchema) {}

// WhatsApp webhook schema
export const WhatsAppWebhookSchema = z.object({
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        messages: z.array(z.object({
          id: z.string(),
          from: z.string(),
          type: z.string(),
          text: z.object({
            body: z.string(),
          }).optional(),
        })).optional(),
      })),
    })),
  })),
});

export class WhatsAppWebhookDto extends createZodDto(WhatsAppWebhookSchema) {}
```

### 2.3 Service Interfaces

```typescript
// src/modules/fleet/interfaces/motorcycle.interface.ts
export interface IMotorcycleService {
  create(dto: CreateMotorcycleDto): Promise<MotorcycleWithRelations>;
  findById(id: string): Promise<MotorcycleWithRelations | null>;
  findByLicensePlate(licensePlate: string): Promise<MotorcycleWithRelations | null>;
  findByCourier(courierId: string): Promise<MotorcycleWithRelations[]>;
  findAll(filters?: MotorcycleFilters): Promise<MotorcycleWithRelations[]>;
  update(id: string, dto: UpdateMotorcycleDto): Promise<MotorcycleWithRelations>;
  delete(id: string): Promise<void>;
  updateMileage(id: string, mileage: number, reportedBy: string): Promise<{
    motorcycle: MotorcycleWithRelations;
    nextMaintenance: MaintenanceCalculationResult;
  }>;
}

// src/modules/maintenance/interfaces/calculator.interface.ts
export interface IMaintenanceCalculator {
  calculateNext(input: {
    motorcycleId?: string;
    type: 'ONE_TWENTY_FIVE' | 'TWO_FIFTY' | 'ELECTRIC';
    currentMileage: number;
    maintenanceHistory?: MaintenanceHistory[];
  }): Promise<MaintenanceCalculationResult>;
}

// src/modules/bot/interfaces/bot.interface.ts
export interface IBotService {
  processMessage(input: ProcessMessageInput): Promise<{
    success: boolean;
    response: WhatsAppMessage;
  }>;
}

export interface IConversationService {
  getOrCreate(phoneNumber: string): Promise<ConversationContext>;
  updateState(phoneNumber: string, updates: Partial<ConversationContext>): Promise<void>;
  clearState(phoneNumber: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

export interface IMenuBuilder {
  buildCourierMainMenu(user: AuthenticatedUser): Promise<WhatsAppMessage>;
  buildAdminMainMenu(user: AuthenticatedUser): Promise<WhatsAppMessage>;
  buildMotorcycleSelectionMenu(user: AuthenticatedUser): Promise<WhatsAppMessage>;
  buildMotorcycleManagementMenu(): Promise<WhatsAppMessage>;
  buildCourierManagementMenu(): Promise<WhatsAppMessage>;
  buildClientManagementMenu(): Promise<WhatsAppMessage>;
  buildReportsMenu(): Promise<WhatsAppMessage>;
}

export interface IResponseGenerator {
  generateMileageReportSuccess(
    motorcycle: MotorcycleWithRelations,
    nextMaintenance: MaintenanceCalculationResult
  ): WhatsAppMessage;
  generateError(message: string): WhatsAppMessage;
  generateInvalidSelectionMessage(): WhatsAppMessage;
  generateHelpMessage(user: AuthenticatedUser): WhatsAppMessage;
}
```

---

## 3. Bot State Machine Design

### 3.1 Conversation States Enum

```typescript
// src/modules/bot/enums/conversation-state.enum.ts
export enum ConversationState {
  IDLE = 'IDLE',
  AWAITING_MENU_SELECTION = 'AWAITING_MENU_SELECTION',
  AWAITING_MOTORCYCLE_SELECTION = 'AWAITING_MOTORCYCLE_SELECTION',
  AWAITING_MILEAGE_INPUT = 'AWAITING_MILEAGE_INPUT',
  
  // Admin motorcycle creation flow
  AWAITING_MOTORCYCLE_DATA_LICENSE_PLATE = 'AWAITING_MOTORCYCLE_DATA_LICENSE_PLATE',
  AWAITING_MOTORCYCLE_DATA_TYPE = 'AWAITING_MOTORCYCLE_DATA_TYPE',
  AWAITING_MOTORCYCLE_DATA_LICENSE_EXPIRY = 'AWAITING_MOTORCYCLE_DATA_LICENSE_EXPIRY',
  AWAITING_MOTORCYCLE_DATA_INSURANCE_EXPIRY = 'AWAITING_MOTORCYCLE_DATA_INSURANCE_EXPIRY',
  AWAITING_MOTORCYCLE_DATA_INSURANCE_TYPE = 'AWAITING_MOTORCYCLE_DATA_INSURANCE_TYPE',
  AWAITING_MOTORCYCLE_DATA_CURRENT_MILEAGE = 'AWAITING_MOTORCYCLE_DATA_CURRENT_MILEAGE',
  AWAITING_MOTORCYCLE_DATA_COURIER_ASSIGNMENT = 'AWAITING_MOTORCYCLE_DATA_COURIER_ASSIGNMENT',
  CONFIRMING_MOTORCYCLE_CREATION = 'CONFIRMING_MOTORCYCLE_CREATION',
}
```

### 3.2 State Machine Implementation

```typescript
// src/modules/bot/services/state-machine.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConversationState } from '../enums/conversation-state.enum';

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  // State transition rules
  private readonly transitions: Record<ConversationState, ConversationState[]> = {
    [ConversationState.IDLE]: [
      ConversationState.AWAITING_MENU_SELECTION,
    ],
    [ConversationState.AWAITING_MENU_SELECTION]: [
      ConversationState.AWAITING_MOTORCYCLE_SELECTION, // Courier: report mileage
      ConversationState.AWAITING_MOTORCYCLE_DATA_LICENSE_PLATE, // Admin: add motorcycle
      ConversationState.IDLE, // Help or back
    ],
    [ConversationState.AWAITING_MOTORCYCLE_SELECTION]: [
      ConversationState.AWAITING_MILEAGE_INPUT,
      ConversationState.AWAITING_MENU_SELECTION, // Back
    ],
    [ConversationState.AWAITING_MILEAGE_INPUT]: [
      ConversationState.IDLE, // Success or back
      ConversationState.AWAITING_MOTORCYCLE_SELECTION, // Invalid input, try again
    ],
    // Admin motorcycle creation flow
    [ConversationState.AWAITING_MOTORCYCLE_DATA_LICENSE_PLATE]: [
      ConversationState.AWAITING_MOTORCYCLE_DATA_TYPE,
      ConversationState.AWAITING_MENU_SELECTION, // Cancel
    ],
    [ConversationState.AWAITING_MOTORCYCLE_DATA_TYPE]: [
      ConversationState.AWAITING_MOTORCYCLE_DATA_LICENSE_EXPIRY,
      ConversationState.AWAITING_MOTORCYCLE_DATA_LICENSE_PLATE, // Back
    ],
    [ConversationState.AWAITING_MOTORCYCLE_DATA_LICENSE_EXPIRY]: [
      ConversationState.AWAITING_MOTORCYCLE_DATA_INSURANCE_EXPIRY,
      ConversationState.AWAITING_MOTORCYCLE_DATA_TYPE, // Back
    ],
    [ConversationState.AWAITING_MOTORCYCLE_DATA_INSURANCE_EXPIRY]: [
      ConversationState.AWAITING_MOTORCYCLE_DATA_INSURANCE_TYPE,
      ConversationState.AWAITING_MOTORCYCLE_DATA_LICENSE_EXPIRY, // Back
    ],
    [ConversationState.AWAITING_MOTORCYCLE_DATA_INSURANCE_TYPE]: [
      ConversationState.AWAITING_MOTORCYCLE_DATA_CURRENT_MILEAGE,
      ConversationState.AWAITING_MOTORCYCLE_DATA_INSURANCE_EXPIRY, // Back
    ],
    [ConversationState.AWAITING_MOTORCYCLE_DATA_CURRENT_MILEAGE]: [
      ConversationState.AWAITING_MOTORCYCLE_DATA_COURIER_ASSIGNMENT,
      ConversationState.AWAITING_MOTORCYCLE_DATA_INSURANCE_TYPE, // Back
    ],
    [ConversationState.AWAITING_MOTORCYCLE_DATA_COURIER_ASSIGNMENT]: [
      ConversationState.CONFIRMING_MOTORCYCLE_CREATION,
      ConversationState.AWAITING_MOTORCYCLE_DATA_CURRENT_MILEAGE, // Back
    ],
    [ConversationState.CONFIRMING_MOTORCYCLE_CREATION]: [
      ConversationState.IDLE, // Confirmed or cancelled
      ConversationState.AWAITING_MOTORCYCLE_DATA_COURIER_ASSIGNMENT, // Back to edit
    ],
  };

  canTransition(from: ConversationState, to: ConversationState): boolean {
    const allowedTransitions = this.transitions[from] || [];
    return allowedTransitions.includes(to);
  }

  validateTransition(from: ConversationState, to: ConversationState): void {
    if (!this.canTransition(from, to)) {
      this.logger.warn(`Invalid state transition: ${from} -> ${to}`);
      throw new Error(`Invalid state transition: ${from} -> ${to}`);
    }
  }

  getNextStates(current: ConversationState): ConversationState[] {
    return this.transitions[current] || [];
  }
}
```

### 3.3 Conversation Context Manager

```typescript
// src/modules/bot/services/conversation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { ConversationState } from '../enums/conversation-state.enum';

interface ConversationData {
  // Motorcycle creation data
  motorcycleData?: {
    licensePlate?: string;
    type?: 'ONE_TWENTY_FIVE' | 'TWO_FIFTY' | 'ELECTRIC';
    licenseExpiryDate?: string;
    insuranceExpiryDate?: string;
    insuranceType?: 'SINGLE_DRIVER' | 'ANY_DRIVER';
    currentMileage?: number;
    assignedCourierId?: string;
  };
  
  // Selected motorcycle for mileage reporting
  selectedMotorcycleId?: string;
  
  // Menu navigation
  lastMenuSelection?: number;
  
  // Error handling
  retryCount?: number;
  lastError?: string;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly CONVERSATION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor(private prisma: PrismaService) {}

  async getOrCreate(phoneNumber: string): Promise<ConversationContext> {
    let conversation = await this.prisma.conversationState.findUnique({
      where: { userPhone: phoneNumber },
      include: { user: true },
    });

    if (!conversation) {
      conversation = await this.prisma.conversationState.create({
        data: {
          userPhone: phoneNumber,
          state: ConversationState.IDLE,
          context: {},
          expiresAt: new Date(Date.now() + this.CONVERSATION_TIMEOUT),
        },
        include: { user: true },
      });
    }

    // Check if conversation expired
    if (conversation.expiresAt && conversation.expiresAt < new Date()) {
      await this.clearState(phoneNumber);
      conversation = await this.prisma.conversationState.create({
        data: {
          userPhone: phoneNumber,
          state: ConversationState.IDLE,
          context: {},
          expiresAt: new Date(Date.now() + this.CONVERSATION_TIMEOUT),
        },
        include: { user: true },
      });
    }

    return {
      userId: conversation.user.id,
      state: conversation.state as ConversationState,
      data: (conversation.context as ConversationData) || {},
      lastActivity: conversation.lastActivity,
      expiresAt: conversation.expiresAt,
    };
  }

  async updateState(
    phoneNumber: string,
    updates: {
      state?: ConversationState;
      data?: Partial<ConversationData>;
    }
  ): Promise<void> {
    const current = await this.prisma.conversationState.findUnique({
      where: { userPhone: phoneNumber },
    });

    if (!current) {
      throw new Error(`Conversation not found for ${phoneNumber}`);
    }

    const newData = {
      ...(current.context as ConversationData || {}),
      ...updates.data,
    };

    await this.prisma.conversationState.update({
      where: { userPhone: phoneNumber },
      data: {
        state: updates.state || current.state,
        context: newData,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + this.CONVERSATION_TIMEOUT),
      },
    });
  }

  async clearState(phoneNumber: string): Promise<void> {
    await this.prisma.conversationState.update({
      where: { userPhone: phoneNumber },
      data: {
        state: ConversationState.IDLE,
        context: {},
        lastActivity: new Date(),
        expiresAt: null,
      },
    });
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.conversationState.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        state: ConversationState.IDLE,
        context: {},
        expiresAt: null,
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired conversations`);
    return result.count;
  }
}
```

---

## 4. Service Layer Architecture

### 4.1 Maintenance Calculator Service

```typescript
// src/modules/maintenance/services/maintenance-calculator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { MaintenanceType, MotorcycleType } from '@prisma/client';

interface CalculationInput {
  motorcycleId?: string;
  type: MotorcycleType;
  currentMileage: number;
  maintenanceHistory?: Array<{
    maintenanceType: MaintenanceType;
    mileageAtMaintenance: number;
  }>;
}

@Injectable()
export class MaintenanceCalculatorService {
  private readonly logger = new Logger(MaintenanceCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  async calculateNext(input: CalculationInput): Promise<MaintenanceCalculationResult> {
    const { type, currentMileage, motorcycleId } = input;

    // Get maintenance history if not provided
    let history = input.maintenanceHistory;
    if (!history && motorcycleId) {
      const records = await this.prisma.maintenanceHistory.findMany({
        where: { motorcycleId },
        orderBy: { mileageAtMaintenance: 'asc' },
        select: {
          maintenanceType: true,
          mileageAtMaintenance: true,
        },
      });
      history = records;
    }

    switch (type) {
      case MotorcycleType.ONE_TWENTY_FIVE:
        return this.calculate125Cycle(currentMileage, history || []);
      
      case MotorcycleType.TWO_FIFTY:
        return this.calculate250Cycle(currentMileage, history || []);
      
      case MotorcycleType.ELECTRIC:
        return {
          type: MaintenanceType.NONE,
          nextMileage: null,
          dueIn: null,
          intervalKm: 0,
          cyclePosition: 0,
        };
      
      default:
        throw new Error(`Unknown motorcycle type: ${type}`);
    }
  }

  private calculate125Cycle(
    currentMileage: number,
    history: Array<{ maintenanceType: MaintenanceType; mileageAtMaintenance: number }>
  ): MaintenanceCalculationResult {
    const INTERVAL = 4000;
    
    // Filter out NONE maintenance types and sort by mileage
    const validHistory = history
      .filter(h => h.maintenanceType !== MaintenanceType.NONE)
      .sort((a, b) => a.mileageAtMaintenance - b.mileageAtMaintenance);

    // Determine cycle position (0-based)
    const cyclePosition = validHistory.length % 2;
    
    // Pattern: Small (0), Large (1), repeat
    // 4000km Small -> 8000km Large -> 12000km Small -> 16000km Large
    const nextType = cyclePosition === 0 ? MaintenanceType.SMALL : MaintenanceType.LARGE;
    
    // Calculate next milestone
    const nextMileage = Math.ceil(currentMileage / INTERVAL) * INTERVAL;
    const adjustedNextMileage = nextMileage <= currentMileage ? nextMileage + INTERVAL : nextMileage;
    
    return {
      type: nextType,
      nextMileage: adjustedNextMileage,
      dueIn: adjustedNextMileage - currentMileage,
      intervalKm: INTERVAL,
      cyclePosition,
    };
  }

  private calculate250Cycle(
    currentMileage: number,
    history: Array<{ maintenanceType: MaintenanceType; mileageAtMaintenance: number }>
  ): MaintenanceCalculationResult {
    const INTERVAL = 5000;
    
    // Filter out NONE maintenance types and sort by mileage
    const validHistory = history
      .filter(h => h.maintenanceType !== MaintenanceType.NONE)
      .sort((a, b) => a.mileageAtMaintenance - b.mileageAtMaintenance);

    // Determine cycle position (0-based)
    const cyclePosition = validHistory.length % 3;
    
    // Pattern: Small (0), Small (1), Large (2), repeat
    // 5000km Small -> 10000km Small -> 15000km Large -> 20000km Small
    const nextType = cyclePosition === 2 ? MaintenanceType.LARGE : MaintenanceType.SMALL;
    
    // Calculate next milestone
    const nextMileage = Math.ceil(currentMileage / INTERVAL) * INTERVAL;
    const adjustedNextMileage = nextMileage <= currentMileage ? nextMileage + INTERVAL : nextMileage;
    
    return {
      type: nextType,
      nextMileage: adjustedNextMileage,
      dueIn: adjustedNextMileage - currentMileage,
      intervalKm: INTERVAL,
      cyclePosition,
    };
  }
}
```

### 4.2 Motorcycle Service

```typescript
// src/modules/fleet/services/motorcycle.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/database/prisma.service';
import { MaintenanceCalculatorService } from '@/modules/maintenance/services/maintenance-calculator.service';
import { CreateMotorcycleDto, UpdateMotorcycleDto } from '../dto';

@Injectable()
export class MotorcycleService {
  constructor(
    private prisma: PrismaService,
    private maintenanceCalculator: MaintenanceCalculatorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateMotorcycleDto): Promise<MotorcycleWithRelations> {
    // Check if license plate already exists
    const existing = await this.prisma.motorcycle.findUnique({
      where: { licensePlate: dto.licensePlate },
    });

    if (existing) {
      throw new BadRequestException('מספר רישיון כבר קיים במערכת');
    }

    // Calculate initial maintenance schedule
    const nextMaintenance = await this.maintenanceCalculator.calculateNext({
      type: dto.type,
      currentMileage: dto.currentMileage,
    });

    const motorcycle = await this.prisma.motorcycle.create({
      data: {
        ...dto,
        nextMaintenanceMileage: nextMaintenance.nextMileage,
        nextMaintenanceType: nextMaintenance.type,
      },
      include: {
        assignedCourier: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        assignedClient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Invalidate cache
    if (dto.assignedCourierId) {
      await this.invalidateCourierCache(dto.assignedCourierId);
    }

    return motorcycle;
  }

  async findById(id: string): Promise<MotorcycleWithRelations | null> {
    return this.prisma.motorcycle.findUnique({
      where: { id },
      include: {
        assignedCourier: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        assignedClient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findByLicensePlate(licensePlate: string): Promise<MotorcycleWithRelations | null> {
    return this.prisma.motorcycle.findUnique({
      where: { licensePlate },
      include: {
        assignedCourier: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        assignedClient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findByCourier(courierId: string): Promise<MotorcycleWithRelations[]> {
    const cacheKey = `courier:${courierId}:motorcycles`;
    
    // Try cache first
    let motorcycles = await this.cacheManager.get<MotorcycleWithRelations[]>(cacheKey);
    
    if (!motorcycles) {
      motorcycles = await this.prisma.motorcycle.findMany({
        where: { assignedCourierId: courierId },
        include: {
          assignedCourier: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
            },
          },
          assignedClient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { licensePlate: 'asc' },
      });
      
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, motorcycles, 300);
    }
    
    return motorcycles;
  }

  async updateMileage(
    id: string,
    mileage: number,
    reportedBy: string
  ): Promise<{
    motorcycle: MotorcycleWithRelations;
    nextMaintenance: MaintenanceCalculationResult;
  }> {
    const motorcycle = await this.findById(id);
    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    // Validate mileage is not decreasing significantly
    if (mileage < motorcycle.currentMileage - 1000) {
      throw new BadRequestException('הקילומטר החדש נמוך משמעותית מהקילומטר הנוכחי');
    }

    // Calculate new maintenance schedule
    const nextMaintenance = await this.maintenanceCalculator.calculateNext({
      motorcycleId: id,
      type: motorcycle.type,
      currentMileage: mileage,
    });

    // Update motorcycle and create mileage report in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update motorcycle
      const updatedMotorcycle = await tx.motorcycle.update({
        where: { id },
        data: {
          currentMileage: mileage,
          nextMaintenanceMileage: nextMaintenance.nextMileage,
          nextMaintenanceType: nextMaintenance.type,
        },
        include: {
          assignedCourier: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
            },
          },
          assignedClient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create mileage report
      await tx.mileageReport.create({
        data: {
          motorcycleId: id,
          courierId: reportedBy,
          reportedMileage: mileage,
        },
      });

      return updatedMotorcycle;
    });

    // Invalidate cache
    if (motorcycle.assignedCourierId) {
      await this.invalidateCourierCache(motorcycle.assignedCourierId);
    }

    return {
      motorcycle: result,
      nextMaintenance,
    };
  }

  private async invalidateCourierCache(courierId: string): Promise<void> {
    await this.cacheManager.del(`courier:${courierId}:motorcycles`);
  }
}
```

---

## 5. WhatsApp Integration Layer

### 5.1 WhatsApp Service

```typescript
// src/modules/whatsapp/services/whatsapp.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { env } from '@/config/env.config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl = env.WHATSAPP_API_URL;
  private readonly accountSid = env.WHATSAPP_ACCOUNT_SID;
  private readonly authToken = env.WHATSAPP_AUTH_TOKEN;
  private readonly phoneNumber = env.WHATSAPP_PHONE_NUMBER;

  async sendMessage(to: string, message: WhatsAppMessage): Promise<void> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/Accounts/${this.accountSid}/Messages.json`,
        {
          From: `whatsapp:${this.phoneNumber}`,
          To: `whatsapp:${to}`,
          Body: message.text.body,
        },
        {
          auth: {
            username: this.accountSid,
            password: this.authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.logger.log(`Message sent to ${to}: ${response.data.sid}`);
    } catch (error) {
      this.logger.error(`Failed to send message to ${to}:`, error);
      throw error;
    }
  }

  async verifyWebhookSignature(signature: string, body: string): Promise<boolean> {
    // Implement webhook signature verification
    // This depends on your WhatsApp API provider
    return true; // Simplified for MVP
  }
}
```

### 5.2 Message Formatter Service

```typescript
// src/modules/whatsapp/services/message-formatter.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageFormatterService {
  formatNumber(num: number): string {
    return new Intl.NumberFormat('he-IL').format(num);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  formatMotorcycleType(type: string): string {
    const typeMap = {
      'ONE_TWENTY_FIVE': '125',
      'TWO_FIFTY': '250',
      'ELECTRIC': 'חשמלי',
    };
    return typeMap[type] || type;
  }

  formatMaintenanceType(type: string): string {
    const typeMap = {
      'SMALL': 'טיפול קטן',
      'LARGE': 'טיפול גדול',
      'NONE': 'אין צורך בטיפול',
    };
    return typeMap[type] || type;
  }

  formatInsuranceType(type: string): string {
    const typeMap = {
      'SINGLE_DRIVER': 'נהג יחיד',
      'ANY_DRIVER': 'כל נהג',
    };
    return typeMap[type] || type;
  }

  createMenuMessage(title: string, options: Array<{ number: number; text: string }>): string {
    const optionsText = options
      .map(opt => `${opt.number}️⃣ ${opt.text}`)
      .join('\n');
    
    return `${title}\n\n${optionsText}\n\nשלח מספר (${options.map(o => o.number).join(' או ')})`;
  }
}
```

---

## 6. Validation & Error Handling

### 6.1 Global Exception Filter

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'שגיאה פנימית בשרת';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse['message']) {
        message = Array.isArray(exceptionResponse['message'])
          ? exceptionResponse['message'].join(', ')
          : exceptionResponse['message'];
      }
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Error: ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

### 6.2 Validation Pipes

```typescript
// src/common/pipes/zod-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      throw new BadRequestException('נתונים לא תקינים');
    }
  }
}
```

---

## 7. Configuration Management

### 7.1 Environment Configuration

```typescript
// src/config/env.config.ts
import { cleanEnv, str, port, url, num, bool } from 'envalid';

export const env = cleanEnv(process.env, {
  // Application
  NODE_ENV: str({ 
    choices: ['development', 'production', 'test'],
    default: 'development' 
  }),
  PORT: port({ default: 3000 }),
  
  // Database
  DATABASE_URL: url({
    desc: 'PostgreSQL connection string',
    example: 'postgresql://user:pass@host:5432/db'
  }),
  
  // WhatsApp API
  WHATSAPP_API_URL: url({
    desc: 'WhatsApp API base URL',
    example: 'https://api.twilio.com/2010-04-01'
  }),
  WHATSAPP_ACCOUNT_SID: str({
    desc: 'WhatsApp API account SID'
  }),
  WHATSAPP_AUTH_TOKEN: str({
    desc: 'WhatsApp API auth token'
  }),
  WHATSAPP_PHONE_NUMBER: str({
    desc: 'WhatsApp business phone number',
    format: (val) => {
      if (!val.match(/^\+\d{10,15}$/)) {
        throw new Error('Phone number must be in E.164 format');
      }
      return val;
    }
  }),
  
  // Security
  WEBHOOK_SECRET: str({ 
    desc: 'WhatsApp webhook verification token' 
  }),
  
  // Monitoring
  SENTRY_DSN: url({ 
    default: '',
    desc: 'Sentry error tracking DSN' 
  }),
  
  // Features
  ENABLE_RATE_LIMITING: bool({ default: true }),
  MAX_REQUESTS_PER_MINUTE: num({ default: 20 }),
  
  // Cache
  CACHE_TTL_SECONDS: num({ default: 300 }), // 5 minutes
  CACHE_MAX_ITEMS: num({ default: 100 }),
  
  // Conversation
  CONVERSATION_TIMEOUT_MINUTES: num({ default: 30 }),
});

// Type-safe environment variables
export type Environment = typeof env;
```

---

## 8. Testing Strategy

### 8.1 Unit Test Example

```typescript
// src/modules/maintenance/services/maintenance-calculator.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceCalculatorService } from './maintenance-calculator.service';
import { PrismaService } from '@/database/prisma.service';
import { MotorcycleType, MaintenanceType } from '@prisma/client';

describe('MaintenanceCalculatorService', () => {
  let service: MaintenanceCalculatorService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceCalculatorService,
        {
          provide: PrismaService,
          useValue: {
            maintenanceHistory: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MaintenanceCalculatorService>(MaintenanceCalculatorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('125cc motorcycle maintenance calculation', () => {
    it('should calculate first small maintenance at 4000km for new motorcycle', async () => {
      // Arrange
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue([]);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.ONE_TWENTY_FIVE,
        currentMileage: 500,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(4000);
      expect(result.dueIn).toBe(3500);
      expect(result.intervalKm).toBe(4000);
      expect(result.cyclePosition).toBe(0);
    });

    it('should follow Small-Large alternating pattern correctly', async () => {
      // Arrange - motorcycle with 1 small maintenance completed
      const mockHistory = [
        { maintenanceType: MaintenanceType.SMALL, mileageAtMaintenance: 4000 },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.ONE_TWENTY_FIVE,
        currentMileage: 4500,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.LARGE);
      expect(result.nextMileage).toBe(8000);
      expect(result.dueIn).toBe(3500);
      expect(result.cyclePosition).toBe(1);
    });
  });

  describe('250cc motorcycle maintenance calculation', () => {
    it('should follow Small-Small-Large pattern correctly', async () => {
      // Arrange - motorcycle with 2 small maintenances completed
      const mockHistory = [
        { maintenanceType: MaintenanceType.SMALL, mileageAtMaintenance: 5000 },
        { maintenanceType: MaintenanceType.SMALL, mileageAtMaintenance: 10000 },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.TWO_FIFTY,
        currentMileage: 12000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.LARGE);
      expect(result.nextMileage).toBe(15000);
      expect(result.dueIn).toBe(3000);
      expect(result.intervalKm).toBe(5000);
      expect(result.cyclePosition).toBe(2);
    });

    it('should return to small maintenance after large', async () => {
      // Arrange - motorcycle with Small-Small-Large completed
      const mockHistory = [
        { maintenanceType: MaintenanceType.SMALL, mileageAtMaintenance: 5000 },
        { maintenanceType: MaintenanceType.SMALL, mileageAtMaintenance: 10000 },
        { maintenanceType: MaintenanceType.LARGE, mileageAtMaintenance: 15000 },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.TWO_FIFTY,
        currentMileage: 16000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(20000);
      expect(result.dueIn).toBe(4000);
      expect(result.cyclePosition).toBe(0);
    });
  });

  describe('Electric motorcycle', () => {
    it('should return no maintenance needed', async () => {
      // Act
      const result = await service.calculateNext({
        type: MotorcycleType.ELECTRIC,
        currentMileage: 5000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.NONE);
      expect(result.nextMileage).toBeNull();
      expect(result.dueIn).toBeNull();
      expect(result.intervalKm).toBe(0);
    });
  });
});
```

### 8.2 E2E Test Example

```typescript
// test/webhook.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/database/prisma.service';
import { UserRole, MotorcycleType, InsuranceType } from '@prisma/client';

describe('Webhook (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.mileageReport.deleteMany();
    await prisma.maintenanceHistory.deleteMany();
    await prisma.motorcycle.deleteMany();
    await prisma.conversationState.deleteMany();
    await prisma.courier.deleteMany();
    await prisma.user.deleteMany();
    await prisma.client.deleteMany();
  });

  describe('Courier mileage reporting flow', () => {
    it('should handle complete mileage reporting conversation', async () => {
      // Setup test data
      const client = await prisma.client.create({
        data: { name: 'Test Client' },
      });

      const courier = await prisma.courier.create({
        data: {
          name: 'Test Courier',
          phoneNumber: '+972501234567',
          clientId: client.id,
          user: {
            create: {
              phoneNumber: '+972501234567',
              role: UserRole.COURIER,
            },
          },
        },
      });

      const motorcycle = await prisma.motorcycle.create({
        data: {
          licensePlate: '123456',
          type: MotorcycleType.ONE_TWENTY_FIVE,
          currentMileage: 3000,
          licenseExpiryDate: new Date('2026-01-01'),
          insuranceExpiryDate: new Date('2026-01-01'),
          insuranceType: InsuranceType.ANY_DRIVER,
          assignedCourierId: courier.id,
          assignedClientId: client.id,
        },
      });

      // Step 1: Initial greeting
      const greeting = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_1',
                from: '+972501234567',
                type: 'text',
                text: { body: 'שלום' },
              }],
            },
          }],
        }],
      };

      const greetingResponse = await request(app.getHttpServer())
        .post('/webhook')
        .send(greeting)
        .expect(200);

      expect(greetingResponse.body.status).toBe('success');

      // Step 2: Select mileage reporting
      const selectMileage = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_2',
                from: '+972501234567',
                type: 'text',
                text: { body: '1' },
              }],
            },
          }],
        }],
      };

      await request(app.getHttpServer())
        .post('/webhook')
        .send(selectMileage)
        .expect(200);

      // Step 3: Select motorcycle
      const selectMotorcycle = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_3',
                from: '+972501234567',
                type: 'text',
                text: { body: '1' },
              }],
            },
          }],
        }],
      };

      await request(app.getHttpServer())
        .post('/webhook')
        .send(selectMotorcycle)
        .expect(200);

      // Step 4: Report mileage
      const reportMileage = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_4',
                from: '+972501234567',
                type: 'text',
                text: { body: '5000' },
              }],
            },
          }],
        }],
      };

      const mileageResponse = await request(app.getHttpServer())
        .post('/webhook')
        .send(reportMileage)
        .expect(200);

      expect(mileageResponse.body.status).toBe('success');

      // Verify database updates
      const updatedMotorcycle = await prisma.motorcycle.findUnique({
        where: { id: motorcycle.id },
      });

      expect(updatedMotorcycle.currentMileage).toBe(5000);
      expect(updatedMotorcycle.nextMaintenanceMileage).toBe(8000);

      const mileageReport = await prisma.mileageReport.findFirst({
        where: { motorcycleId: motorcycle.id },
      });

      expect(mileageReport).toBeTruthy();
      expect(mileageReport.reportedMileage).toBe(5000);
    });
  });
});
```

---

## 9. Implementation Plan

### 9.1 Development Phases

#### Phase 1: Foundation (Days 1-2)
```bash
# Day 1: Project Setup
- Initialize NestJS project
- Setup Prisma with PostgreSQL
- Configure environment variables with Envalid
- Setup basic project structure
- Configure ESLint, Prettier, Jest

# Day 2: Database & Core Services
- Implement Prisma schema
- Create database migrations
- Setup PrismaService
- Implement basic CRUD repositories
- Setup caching with @nestjs/cache-manager
```

#### Phase 2: Core Business Logic (Days 3-4)
```bash
# Day 3: Maintenance Engine
- Implement MaintenanceCalculatorService
- Create comprehensive unit tests
- Implement MaintenanceHistoryService
- Test all motorcycle type calculations

# Day 4: Fleet Management
- Implement MotorcycleService
- Implement CourierService
- Implement ClientService
- Add validation with Zod schemas
```

#### Phase 3: Bot & WhatsApp Integration (Days 5-6)
```bash
# Day 5: Bot State Machine
- Implement ConversationService
- Create StateMachineService
- Implement text-based menu builders
- Create response generators

# Day 6: WhatsApp Integration
- Implement WhatsAppService
- Create webhook controller
- Implement message processing pipeline
- Add error handling and retry logic
```

#### Phase 4: Testing & Deployment (Days 7-8)
```bash
# Day 7: Testing
- Complete unit test coverage
- Implement integration tests
- Create E2E tests for critical flows
- Performance testing

# Day 8: Deployment
- Setup Render configuration
- Deploy to staging environment
- Data migration and seeding
- Production deployment
```

### 9.2 Implementation Checklist

#### Database Layer
- [ ] Prisma schema implementation
- [ ] Database migrations
- [ ] Seed data script
- [ ] Performance indexes
- [ ] Connection pooling configuration

#### Service Layer
- [ ] MaintenanceCalculatorService with full test coverage
- [ ] MotorcycleService with caching
- [ ] CourierService
- [ ] ClientService
- [ ] AuthService with phone-based auth

#### Bot Layer
- [ ] ConversationService with state persistence
- [ ] StateMachineService with transition validation
- [ ] MenuBuilderService for text-based menus
- [ ] ResponseGeneratorService with Hebrew formatting
- [ ] BotService orchestrating the conversation flow

#### WhatsApp Integration
- [ ] WhatsAppService with Twilio integration
- [ ] WebhookController with signature validation
- [ ] MessageFormatterService for Hebrew text
- [ ] Error handling and retry mechanisms

#### Configuration & Infrastructure
- [ ] Environment configuration with Envalid
- [ ] Logging with Winston
- [ ] Error tracking with Sentry
- [ ] Rate limiting with @nestjs/throttler
- [ ] Health checks

#### Testing
- [ ] Unit tests for all services (>90% coverage)
- [ ] Integration tests for API endpoints
- [ ] E2E tests for complete user flows
- [ ] Performance tests for concurrent users

#### Deployment
- [ ] Render configuration
- [ ] Environment variables setup
- [ ] Database deployment
- [ ] Production monitoring
- [ ] Backup strategy

### 9.3 Success Criteria

#### Technical Criteria
- [ ] All tests passing with >90% coverage
- [ ] Response time <3 seconds for all operations
- [ ] Zero data loss during operations
- [ ] Proper error handling and user feedback
- [ ] Hebrew text formatting working correctly

#### Functional Criteria
- [ ] Couriers can report mileage successfully
- [ ] Admin can manage all fleet entities
- [ ] Maintenance calculations are accurate
- [ ] Conversation state persists correctly
- [ ] WhatsApp integration works reliably

#### Business Criteria
- [ ] All 10 couriers onboarded successfully
- [ ] Admin can manage fleet entirely via WhatsApp
- [ ] Zero missed maintenance calculations
- [ ] System operational cost within budget
- [ ] User satisfaction >8/10

---

## Conclusion

This Low-Level Design provides comprehensive implementation specifications for the Speedy MVP, including:

✅ **Complete Database Schema** with Prisma and PostgreSQL  
✅ **Detailed API Contracts** with Zod validation  
✅ **Bot State Machine** for text-based conversations  
✅ **Service Layer Architecture** with caching and error handling  
✅ **WhatsApp Integration** patterns for reliable messaging  
✅ **Testing Strategy** with unit, integration, and E2E tests  
✅ **Step-by-Step Implementation Plan** for 8-day delivery  

The design prioritizes:
- **Type Safety** throughout the entire stack
- **Text-Based Simplicity** for rapid MVP deployment
- **Comprehensive Testing** for reliability
- **Performance Optimization** with caching and indexing
- **Hebrew Language Support** with proper formatting
- **Scalable Architecture** for future growth
- **Correct Maintenance Logic** for 125cc and 250cc motorcycles

This LLD serves as the definitive implementation guide, ensuring consistent development practices and successful MVP delivery within the 8-day timeline.
