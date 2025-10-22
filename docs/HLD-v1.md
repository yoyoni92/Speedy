# Speedy - High-Level Design (HLD) Document

**Project:** Speedy Fleet Management System  
**Version:** 1.0  
**Date:** October 22, 2025  
**Author:** CTO & Software Architect  
**Reviewed By:** VP R&D  
**Status:** Approved for Development

---

## Executive Review Notes

### CTO Review ✅
- Architecture supports 10x scale without redesign
- Cost-effective stack suitable for MVP budget constraints
- Security model appropriate for sensitivity level
- Technology choices align with team capabilities
- Recovery and backup strategy adequate

### VP R&D Review ✅
- Clear separation of concerns enables parallel development
- Modular design allows iterative delivery
- Testing strategy well-defined
- Monitoring and observability built-in from start
- Technical debt minimized through proper abstractions

**Approval Status:** ✅ **APPROVED FOR IMPLEMENTATION**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [System Architecture](#3-system-architecture)
4. [Component Design](#4-component-design)
5. [Data Architecture](#5-data-architecture)
6. [Integration Architecture](#6-integration-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Technology Stack](#8-technology-stack)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Scalability & Performance](#10-scalability--performance)
11. [Monitoring & Operations](#11-monitoring--operations)
12. [Development Strategy](#12-development-strategy)
13. [Risk Assessment](#13-risk-assessment)

---

## 1. System Overview

### 1.1 System Purpose

Speedy is a WhatsApp-based fleet management system that enables motorcycle courier companies to track maintenance schedules, legal compliance, and operational data through conversational interfaces in Hebrew.

### 1.2 Key Requirements

**Functional:**
- WhatsApp chatbot interface (Hebrew, RTL)
- Phone-based authentication
- Role-based access (Admin, Courier)
- Maintenance scheduling engine
- Historical data tracking
- CRUD operations for fleet entities

**Non-Functional:**
- Response time < 3 seconds
- Support 10+ concurrent users
- 99% uptime during business hours
- Cost: $0-100/month for MVP
- Scale to 100 motorcycles without redesign

### 1.3 System Context Diagram

```mermaid
graph TB
    subgraph "External Users"
        Admin[Admin User<br/>Fleet Manager]
        Courier1[Courier 1]
        Courier2[Courier 2]
        CourierN[Courier N]
    end
    
    subgraph "External Services"
        WhatsApp[WhatsApp<br/>Business API]
    end
    
    subgraph "Speedy System"
        Core[Speedy Core<br/>Application]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Database)]
        Storage[File Storage<br/>Supabase]
    end
    
    Admin -->|Manages Fleet| WhatsApp
    Courier1 -->|Reports Mileage| WhatsApp
    Courier2 -->|Reports Mileage| WhatsApp
    CourierN -->|Reports Mileage| WhatsApp
    
    WhatsApp <-->|Webhooks| Core
    Core <-->|Queries| DB
    Core <-->|Files| Storage
    
    style Core fill:#4A90E2
    style DB fill:#50C878
    style WhatsApp fill:#25D366
```

---

## 2. Architecture Principles

### 2.1 Core Principles

**1. Simplicity First**
- Minimize moving parts
- Choose boring technology
- Avoid premature optimization
- Clear over clever

**2. Cost-Conscious**
- Maximize free tier usage
- Pay-as-you-grow model
- Avoid vendor lock-in where possible
- Optimize for TCO (Total Cost of Ownership)

**3. Fail-Safe Operations**
- Graceful degradation
- Data integrity paramount
- Comprehensive logging
- Easy rollback capability

**4. Developer Productivity**
- Fast iteration cycles
- Good local development experience
- Automated testing
- Clear documentation

**5. Future-Proof Foundation**
- Clean separation of concerns
- Well-defined interfaces
- Extensible design patterns
- Migration paths planned

### 2.2 Technology Selection Criteria

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| **Cost** | High | MVP budget constraint ($0-100/month) |
| **Maturity** | High | Minimize production risks |
| **Community** | Medium | Support and resources availability |
| **Learning Curve** | Medium | Team productivity |
| **Scalability** | Medium | 10x growth without redesign |
| **Vendor Lock-in** | Low | Can migrate if needed |

---

## 3. System Architecture

### 3.1 Architectural Style

**Modular Monolith with Event-Driven Elements**

**Rationale:**
- **Monolith:** Simpler deployment, lower operational overhead, faster initial development
- **Modular:** Clear boundaries enable future microservices extraction if needed
- **Event-Driven:** Maintenance calculations triggered by state changes

**Not Microservices Because:**
- Team size (1-3 developers)
- Operational complexity not justified
- Network latency overhead
- Deployment complexity
- Cost of running multiple services

### 3.2 High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Presentation Layer"
        WA[WhatsApp Channel<br/>Twilio/360dialog]
    end
    
    subgraph "Application Layer"
        subgraph "API Gateway"
            Webhook[Webhook Handler<br/>Express.js]
            Auth[Auth Middleware<br/>Phone Verification]
        end
        
        subgraph "Core Services"
            Bot[Bot Engine<br/>Conversation Manager]
            UserSvc[User Service<br/>Role Management]
            FleetSvc[Fleet Service<br/>CRUD Operations]
            MaintenanceSvc[Maintenance Service<br/>Calculation Engine]
            ReportSvc[Reporting Service<br/>Data Aggregation]
        end
        
        subgraph "Cross-Cutting"
            Logger[Logging Service<br/>Structured Logs]
            Cache[Cache Layer<br/>In-Memory]
            Validator[Validation Layer<br/>Schema Enforcement]
        end
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Primary Store)]
        FileStore[File Storage<br/>Supabase Storage]
    end
    
    subgraph "External Services"
        Monitoring[Monitoring<br/>Sentry]
    end
    
    WA <-->|HTTPS/Webhooks| Webhook
    Webhook --> Auth
    Auth --> Bot
    
    Bot --> UserSvc
    Bot --> FleetSvc
    Bot --> ReportSvc
    
    FleetSvc --> MaintenanceSvc
    
    UserSvc --> DB
    FleetSvc --> DB
    MaintenanceSvc --> DB
    ReportSvc --> DB
    
    Bot --> Cache
    FleetSvc --> Cache
    
    Bot --> Logger
    UserSvc --> Logger
    FleetSvc --> Logger
    MaintenanceSvc --> Logger
    
    Logger --> Monitoring
    
    FleetSvc -.->|Future| FileStore
    
    style Bot fill:#4A90E2
    style MaintenanceSvc fill:#E24A90
    style DB fill:#50C878
```

### 3.3 Layered Architecture

```mermaid
graph TB
    subgraph "Layer 1: Presentation"
        L1[WhatsApp Interface<br/>User Interactions]
    end
    
    subgraph "Layer 2: Application/API"
        L2A[Webhook Handlers]
        L2B[Authentication]
        L2C[Request Validation]
    end
    
    subgraph "Layer 3: Business Logic"
        L3A[Bot Conversation Engine]
        L3B[Domain Services]
        L3C[Maintenance Calculator]
    end
    
    subgraph "Layer 4: Data Access"
        L4A[Repository Pattern]
        L4B[ORM - Prisma]
        L4C[Query Builders]
    end
    
    subgraph "Layer 5: Data Storage"
        L5[PostgreSQL Database]
    end
    
    L1 --> L2A
    L2A --> L2B
    L2B --> L2C
    L2C --> L3A
    L3A --> L3B
    L3B --> L3C
    L3B --> L4A
    L3C --> L4A
    L4A --> L4B
    L4B --> L4C
    L4C --> L5
    
    style L3A fill:#4A90E2
    style L3C fill:#E24A90
    style L5 fill:#50C878
```

---

## 4. Component Design

### 4.1 Component Diagram

```mermaid
graph LR
    subgraph "Bot Engine"
        ConvMgr[Conversation<br/>Manager]
        StateMgr[State Machine<br/>FSM]
        MenuBuilder[Menu Builder<br/>Hebrew UI]
        ResponseGen[Response<br/>Generator]
    end
    
    subgraph "Fleet Management"
        MotorcycleMgr[Motorcycle<br/>Manager]
        CourierMgr[Courier<br/>Manager]
        ClientMgr[Client<br/>Manager]
    end
    
    subgraph "Maintenance Engine"
        Calculator[Maintenance<br/>Calculator]
        Scheduler[Maintenance<br/>Scheduler]
        HistoryTracker[History<br/>Tracker]
    end
    
    subgraph "Data Access"
        MotorcycleRepo[(Motorcycle<br/>Repository)]
        CourierRepo[(Courier<br/>Repository)]
        MaintenanceRepo[(Maintenance<br/>Repository)]
    end
    
    ConvMgr --> StateMgr
    StateMgr --> MenuBuilder
    MenuBuilder --> ResponseGen
    
    ConvMgr --> MotorcycleMgr
    ConvMgr --> CourierMgr
    ConvMgr --> ClientMgr
    
    MotorcycleMgr --> Calculator
    Calculator --> Scheduler
    Scheduler --> HistoryTracker
    
    MotorcycleMgr --> MotorcycleRepo
    CourierMgr --> CourierRepo
    Calculator --> MaintenanceRepo
    
    style ConvMgr fill:#4A90E2
    style Calculator fill:#E24A90
```

### 4.2 Core Components

#### 4.2.1 Bot Engine

**Responsibility:** Manage conversational flows and user interactions

**Sub-Components:**

**Conversation Manager**
- Routes incoming messages to appropriate handlers
- Maintains conversation context per user
- Handles multi-step flows
- Manages conversation state persistence

**State Machine (FSM)**
```typescript
enum ConversationState {
  IDLE,
  AWAITING_MENU_SELECTION,
  AWAITING_MOTORCYCLE_SELECTION,
  AWAITING_MILEAGE_INPUT,
  AWAITING_MOTORCYCLE_DATA,
  CONFIRMING_ACTION
}

interface ConversationContext {
  userId: string;
  state: ConversationState;
  data: Record<string, any>;
  lastActivity: Date;
  motorcycleId?: string;
  operation?: string;
}
```

**Menu Builder**
- Generates Hebrew RTL menus
- Creates WhatsApp button interfaces
- Builds dynamic lists based on user role
- Handles accessibility (clear labels, emojis)

**Response Generator**
- Formats messages in Hebrew
- Handles number formatting (thousands separator)
- Generates confirmation messages
- Error message templating

#### 4.2.2 Fleet Management Service

**Responsibility:** CRUD operations for fleet entities

**Motorcycle Manager**
```typescript
interface MotorcycleManager {
  createMotorcycle(data: CreateMotorcycleDTO): Promise<Motorcycle>;
  updateMotorcycle(id: string, data: UpdateMotorcycleDTO): Promise<Motorcycle>;
  getMotorcycle(id: string): Promise<Motorcycle>;
  listMotorcycles(filters?: MotorcycleFilters): Promise<Motorcycle[]>;
  deleteMotorcycle(id: string): Promise<void>;
  assignToCourier(motorcycleId: string, courierId: string): Promise<void>;
  updateMileage(motorcycleId: string, mileage: number, reportedBy: string): Promise<void>;
}
```

**Courier Manager**
```typescript
interface CourierManager {
  createCourier(data: CreateCourierDTO): Promise<Courier>;
  updateCourier(id: string, data: UpdateCourierDTO): Promise<Courier>;
  getCourier(id: string): Promise<Courier>;
  getCourierByPhone(phone: string): Promise<Courier>;
  listCouriers(filters?: CourierFilters): Promise<Courier[]>;
  getAssignedMotorcycles(courierId: string): Promise<Motorcycle[]>;
}
```

**Client Manager**
```typescript
interface ClientManager {
  createClient(data: CreateClientDTO): Promise<Client>;
  updateClient(id: string, data: UpdateClientDTO): Promise<Client>;
  getClient(id: string): Promise<Client>;
  listClients(): Promise<Client[]>;
}
```

#### 4.2.3 Maintenance Engine

**Responsibility:** Calculate and track maintenance schedules

**Core Algorithm:**

```typescript
class MaintenanceCalculator {
  calculateNextMaintenance(
    motorcycle: Motorcycle, 
    currentMileage: number
  ): MaintenanceSchedule {
    const { type } = motorcycle;
    const history = this.getMaintenanceHistory(motorcycle.id);
    
    switch(type) {
      case '125':
        return this.calculate125Cycle(currentMileage, history);
      case '250':
        return this.calculate250Cycle(currentMileage, history);
      case 'ELECTRIC':
        return { type: 'NONE', nextMileage: null };
      default:
        throw new Error(`Unknown motorcycle type: ${type}`);
    }
  }
  
  private calculate125Cycle(
    currentMileage: number, 
    history: MaintenanceRecord[]
  ): MaintenanceSchedule {
    // Pattern: Small, Small, Large (every 4000km)
    const INTERVAL = 4000;
    const cyclePosition = this.determineCyclePosition(history);
    
    const nextMileage = Math.ceil(currentMileage / INTERVAL) * INTERVAL + INTERVAL;
    const nextType = cyclePosition % 3 === 2 ? 'LARGE' : 'SMALL';
    
    return {
      type: nextType,
      nextMileage,
      dueIn: nextMileage - currentMileage
    };
  }
  
  private calculate250Cycle(
    currentMileage: number, 
    history: MaintenanceRecord[]
  ): MaintenanceSchedule {
    // Pattern: Small, Large (alternating every 5000km)
    const INTERVAL = 5000;
    const cyclePosition = this.determineCyclePosition(history);
    
    const nextMileage = Math.ceil(currentMileage / INTERVAL) * INTERVAL + INTERVAL;
    const nextType = cyclePosition % 2 === 0 ? 'SMALL' : 'LARGE';
    
    return {
      type: nextType,
      nextMileage,
      dueIn: nextMileage - currentMileage
    };
  }
  
  private determineCyclePosition(history: MaintenanceRecord[]): number {
    // Count maintenances since last "reset" (start or specific pattern break)
    return history
      .filter(m => m.type !== 'NONE')
      .length;
  }
}
```

**Maintenance Scheduler**
- Stores calculated schedules
- Updates on mileage reports
- Tracks maintenance history
- Validates maintenance completion

**History Tracker**
- Records all maintenance events
- Maintains audit trail
- Supports historical queries
- Enables reporting

#### 4.2.4 User Service

**Responsibility:** Authentication and authorization

```typescript
interface UserService {
  authenticateByPhone(phone: string): Promise<AuthResult>;
  getUserRole(phone: string): Promise<UserRole>;
  validateAccess(userId: string, resource: string, action: string): Promise<boolean>;
}

enum UserRole {
  ADMIN = 'ADMIN',
  COURIER = 'COURIER'
}

interface AuthResult {
  userId: string;
  role: UserRole;
  linkedCourierId?: string;
  permissions: Permission[];
}
```

**Authorization Matrix:**

| Role | Motorcycles | Couriers | Clients | Reports | Mileage |
|------|-------------|----------|---------|---------|---------|
| **Admin** | Full CRUD | Full CRUD | Full CRUD | All | View All |
| **Courier** | View Assigned | View Self | - | - | Report Own |

---

## 5. Data Architecture

### 5.1 Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o| COURIER : "linked_to"
    COURIER ||--o{ MOTORCYCLE : "assigned_to"
    COURIER }o--|| CLIENT : "works_for"
    MOTORCYCLE }o--|| CLIENT : "assigned_to"
    MOTORCYCLE ||--o{ MILEAGE_REPORT : "has"
    MOTORCYCLE ||--o{ MAINTENANCE_HISTORY : "has"
    COURIER ||--o{ MILEAGE_REPORT : "reports"
    
    USER {
        uuid id PK
        string phone_number UK
        enum role
        uuid linked_courier_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    COURIER {
        uuid id PK
        string name
        string phone_number UK
        uuid client_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    CLIENT {
        uuid id PK
        string name
        timestamp created_at
        timestamp updated_at
    }
    
    MOTORCYCLE {
        uuid id PK
        string license_plate UK
        enum type
        string model
        int year
        date license_expiry_date
        date insurance_expiry_date
        enum insurance_type
        int current_mileage
        int next_maintenance_mileage
        enum next_maintenance_type
        uuid assigned_courier_id FK
        uuid assigned_client_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    MILEAGE_REPORT {
        uuid id PK
        uuid motorcycle_id FK
        uuid courier_id FK
        int reported_mileage
        timestamp reported_at
    }
    
    MAINTENANCE_HISTORY {
        uuid id PK
        uuid motorcycle_id FK
        enum maintenance_type
        int mileage_at_maintenance
        date performed_date
        text notes
        timestamp created_at
    }
```

### 5.2 Database Schema (PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'COURIER');
CREATE TYPE motorcycle_type AS ENUM ('125', '250', 'ELECTRIC');
CREATE TYPE insurance_type AS ENUM ('SINGLE_DRIVER', 'ANY_DRIVER');
CREATE TYPE maintenance_type AS ENUM ('SMALL', 'LARGE', 'NONE');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'COURIER',
    linked_courier_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Couriers table
CREATE TABLE couriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_couriers_phone ON couriers(phone_number);
CREATE INDEX idx_couriers_client ON couriers(client_id);

-- Motorcycles table
CREATE TABLE motorcycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    type motorcycle_type NOT NULL,
    model VARCHAR(100),
    year INTEGER,
    license_expiry_date DATE NOT NULL,
    insurance_expiry_date DATE NOT NULL,
    insurance_type insurance_type NOT NULL,
    current_mileage INTEGER NOT NULL DEFAULT 0,
    next_maintenance_mileage INTEGER,
    next_maintenance_type maintenance_type,
    assigned_courier_id UUID REFERENCES couriers(id),
    assigned_client_id UUID REFERENCES clients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_mileage_positive CHECK (current_mileage >= 0),
    CONSTRAINT chk_year_valid CHECK (year IS NULL OR (year >= 2000 AND year <= 2100))
);

CREATE INDEX idx_motorcycles_license ON motorcycles(license_plate);
CREATE INDEX idx_motorcycles_courier ON motorcycles(assigned_courier_id);
CREATE INDEX idx_motorcycles_client ON motorcycles(assigned_client_id);
CREATE INDEX idx_motorcycles_type ON motorcycles(type);
CREATE INDEX idx_motorcycles_next_maintenance ON motorcycles(next_maintenance_mileage);

-- Mileage Reports table
CREATE TABLE mileage_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motorcycle_id UUID NOT NULL REFERENCES motorcycles(id),
    courier_id UUID NOT NULL REFERENCES couriers(id),
    reported_mileage INTEGER NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_reported_mileage_positive CHECK (reported_mileage >= 0)
);

CREATE INDEX idx_mileage_reports_motorcycle ON mileage_reports(motorcycle_id);
CREATE INDEX idx_mileage_reports_courier ON mileage_reports(courier_id);
CREATE INDEX idx_mileage_reports_date ON mileage_reports(reported_at);

-- Maintenance History table
CREATE TABLE maintenance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motorcycle_id UUID NOT NULL REFERENCES motorcycles(id),
    maintenance_type maintenance_type NOT NULL,
    mileage_at_maintenance INTEGER NOT NULL,
    performed_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_maintenance_mileage_positive CHECK (mileage_at_maintenance >= 0)
);

CREATE INDEX idx_maintenance_history_motorcycle ON maintenance_history(motorcycle_id);
CREATE INDEX idx_maintenance_history_date ON maintenance_history(performed_date);

-- Conversation State table (for bot state persistence)
CREATE TABLE conversation_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_phone VARCHAR(20) NOT NULL,
    state VARCHAR(50) NOT NULL,
    context JSONB,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unq_user_conversation UNIQUE(user_phone)
);

CREATE INDEX idx_conversation_states_phone ON conversation_states(user_phone);
CREATE INDEX idx_conversation_states_expiry ON conversation_states(expires_at);

-- Foreign key for users -> couriers
ALTER TABLE users ADD CONSTRAINT fk_users_courier 
    FOREIGN KEY (linked_courier_id) REFERENCES couriers(id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_couriers_updated_at BEFORE UPDATE ON couriers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_motorcycles_updated_at BEFORE UPDATE ON motorcycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.3 Data Access Patterns

**Query Optimization Strategy:**

1. **Courier Login & Authorization (Hot Path)**
```sql
-- Single query to get user context
SELECT u.id, u.role, u.linked_courier_id, c.name, c.client_id
FROM users u
LEFT JOIN couriers c ON c.id = u.linked_courier_id
WHERE u.phone_number = $1;

-- Index: idx_users_phone (already created)
```

2. **List Courier's Motorcycles (Hot Path)**
```sql
-- Get assigned motorcycles with next maintenance
SELECT id, license_plate, type, current_mileage, 
       next_maintenance_mileage, next_maintenance_type
FROM motorcycles
WHERE assigned_courier_id = $1
ORDER BY license_plate;

-- Index: idx_motorcycles_courier (already created)
```

3. **Admin Fleet Overview (Moderate Use)**
```sql
-- Get all motorcycles with status
SELECT m.*, c.name as courier_name, cl.name as client_name
FROM motorcycles m
LEFT JOIN couriers c ON c.id = m.assigned_courier_id
LEFT JOIN clients cl ON cl.id = m.assigned_client_id
ORDER BY m.next_maintenance_mileage ASC NULLS LAST;

-- Uses existing indexes
```

4. **Maintenance Calculation (Medium Path)**
```sql
-- Get maintenance history for calculation
SELECT maintenance_type, mileage_at_maintenance, performed_date
FROM maintenance_history
WHERE motorcycle_id = $1
ORDER BY mileage_at_maintenance ASC;

-- Index: idx_maintenance_history_motorcycle
```

### 5.4 Data Migration Strategy

**Initial Data Load:**

```typescript
// Migration script structure
async function migrateExistingData() {
  // 1. Load clients
  const clientMap = await loadClients(clientsData);
  
  // 2. Load couriers with phone validation
  const courierMap = await loadCouriers(couriersData, clientMap);
  
  // 3. Create user accounts for couriers
  await createUserAccounts(courierMap);
  
  // 4. Load motorcycles with maintenance calculation
  const motorcycleMap = await loadMotorcycles(
    motorcyclesData, 
    courierMap, 
    clientMap
  );
  
  // 5. Calculate initial maintenance schedules
  await calculateInitialMaintenanceSchedules(motorcycleMap);
  
  // 6. Validation and rollback on error
  await validateMigration();
}
```

---

## 6. Integration Architecture

### 6.1 WhatsApp Integration Flow

```mermaid
sequenceDiagram
    participant User as User<br/>(WhatsApp)
    participant WA as WhatsApp<br/>Business API
    participant Webhook as Webhook<br/>Handler
    participant Auth as Auth<br/>Service
    participant Bot as Bot<br/>Engine
    participant Service as Domain<br/>Service
    participant DB as Database
    
    User->>WA: Send Message
    WA->>Webhook: POST /webhook<br/>{message, from}
    
    Webhook->>Webhook: Validate Signature
    Webhook->>Auth: Authenticate(phone)
    Auth->>DB: Get User by Phone
    DB-->>Auth: User + Role
    Auth-->>Webhook: AuthContext
    
    Webhook->>Bot: Process(message, context)
    Bot->>DB: Load Conversation State
    DB-->>Bot: State
    
    Bot->>Bot: Determine Intent
    Bot->>Service: Execute Business Logic
    Service->>DB: Query/Update Data
    DB-->>Service: Result
    Service-->>Bot: Response Data
    
    Bot->>Bot: Generate Response
    Bot->>DB: Save Conversation State
    Bot->>WA: Send Reply
    WA->>User: Deliver Message
    
    Webhook-->>WA: 200 OK
```

### 6.2 WhatsApp API Configuration

**Provider:** Twilio / 360dialog (evaluated based on pricing)

**Webhook Configuration:**
```typescript
interface WebhookConfig {
  url: string; // https://api.speedy.app/webhook
  method: 'POST';
  headers: {
    'Content-Type': 'application/json';
  };
  events: [
    'message.received',
    'message.status',
    'error'
  ];
}
```

**Message Structure:**
```typescript
interface IncomingWhatsAppMessage {
  from: string; // Phone number with country code
  id: string; // Message ID
  timestamp: string;
  type: 'text' | 'interactive' | 'button';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
    };
  };
}

interface OutgoingWhatsAppMessage {
  to: string;
  type: 'text' | 'interactive';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button' | 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}
```

### 6.3 Error Handling & Retries

```mermaid
graph TD
    A[Webhook Receives Request] --> B{Valid Signature?}
    B -->|No| C[Return 401]
    B -->|Yes| D{Parse Message}
    D -->|Fail| E[Log Error + Return 200]
    D -->|Success| F{Process Message}
    F -->|Error| G{Retry Count < 3?}
    G -->|Yes| H[Delay & Retry]
    H --> F
    G -->|No| I[Log Failure + Alert]
    I --> J[Send Error Message to User]
    F -->|Success| K[Return 200 OK]
    
    style C fill:#E74C3C
    style I fill:#E74C3C
    style K fill:#2ECC71
```

**Retry Strategy:**
```typescript
class WebhookProcessor {
  async processWithRetry(message: IncomingMessage, maxRetries = 3) {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.processMessage(message);
      } catch (error) {
        lastError = error;
        
        // Don't retry validation errors
        if (error instanceof ValidationError) {
          throw error;
        }
        
        // Exponential backoff
        if (attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    // All retries failed
    await this.notifyFailure(message, lastError);
    throw lastError;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 7. Security Architecture

### 7.1 Security Model Overview

```mermaid
graph TB
    subgraph "Attack Surface"
        Internet[Internet]
    end
    
    subgraph "Security Layers"
        WAF[WAF/DDoS Protection<br/>Cloudflare]
        TLS[TLS 1.3<br/>Encrypted Transport]
        Auth[Phone-Based Auth<br/>WhatsApp Verified]
        RBAC[Role-Based Access<br/>Admin/Courier]
        DataVal[Input Validation<br/>Schema Enforcement]
    end
    
    subgraph "Protected Resources"
        API[API Endpoints]
        DB[(Database)]
    end
    
    Internet --> WAF
    WAF --> TLS
    TLS --> Auth
    Auth --> RBAC
    RBAC --> DataVal
    DataVal --> API
    API --> DB
    
    style WAF fill:#E74C3C
    style Auth fill:#F39C12
    style RBAC fill:#3498DB
    style DB fill:#2ECC71
```

### 7.2 Authentication Strategy

**Phone-Based Authentication via WhatsApp:**

```typescript
class AuthenticationService {
  async authenticate(phoneNumber: string): Promise<AuthContext> {
    // 1. Normalize phone number (E.164 format)
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    // 2. Query user by phone
    const user = await this.userRepository.findByPhone(normalizedPhone);
    
    if (!user) {
      throw new UnauthorizedError('מספר טלפון לא מורשה');
    }
    
    // 3. Build auth context
    return {
      userId: user.id,
      role: user.role,
      linkedCourierId: user.linkedCourierId,
      permissions: this.getPermissionsForRole(user.role)
    };
  }
  
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    let normalized = phone.replace(/\D/g, '');
    
    // Add country code if missing (Israel: +972)
    if (!normalized.startsWith('972')) {
      if (normalized.startsWith('0')) {
        normalized = '972' + normalized.substring(1);
      }
    }
    
    return '+' + normalized;
  }
}
```

**Security Assumptions:**
- WhatsApp validates phone number ownership
- SIM swap attacks are out of scope (rely on carrier security)
- No additional 2FA needed for MVP

### 7.3 Authorization Model

**Permission Matrix:**

```typescript
enum Permission {
  // Motorcycle permissions
  MOTORCYCLE_CREATE = 'motorcycle:create',
  MOTORCYCLE_READ_ALL = 'motorcycle:read:all',
  MOTORCYCLE_READ_ASSIGNED = 'motorcycle:read:assigned',
  MOTORCYCLE_UPDATE = 'motorcycle:update',
  MOTORCYCLE_DELETE = 'motorcycle:delete',
  
  // Courier permissions
  COURIER_CREATE = 'courier:create',
  COURIER_READ_ALL = 'courier:read:all',
  COURIER_READ_SELF = 'courier:read:self',
  COURIER_UPDATE = 'courier:update',
  COURIER_DELETE = 'courier:delete',
  
  // Client permissions
  CLIENT_CREATE = 'client:create',
  CLIENT_READ = 'client:read',
  CLIENT_UPDATE = 'client:update',
  CLIENT_DELETE = 'client:delete',
  
  // Mileage permissions
  MILEAGE_REPORT_OWN = 'mileage:report:own',
  MILEAGE_VIEW_ALL = 'mileage:view:all',
  
  // Report permissions
  REPORT_VIEW_ALL = 'report:view:all'
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.MOTORCYCLE_CREATE,
    Permission.MOTORCYCLE_READ_ALL,
    Permission.MOTORCYCLE_UPDATE,
    Permission.MOTORCYCLE_DELETE,
    Permission.COURIER_CREATE,
    Permission.COURIER_READ_ALL,
    Permission.COURIER_UPDATE,
    Permission.COURIER_DELETE,
    Permission.CLIENT_CREATE,
    Permission.CLIENT_READ,
    Permission.CLIENT_UPDATE,
    Permission.CLIENT_DELETE,
    Permission.MILEAGE_VIEW_ALL,
    Permission.REPORT_VIEW_ALL
  ],
  [UserRole.COURIER]: [
    Permission.MOTORCYCLE_READ_ASSIGNED,
    Permission.COURIER_READ_SELF,
    Permission.MILEAGE_REPORT_OWN
  ]
};
```

**Authorization Middleware:**

```typescript
function authorize(...requiredPermissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authContext = req.authContext;
    
    if (!authContext) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const hasPermission = requiredPermissions.every(permission =>
      authContext.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'אין הרשאה לביצוע פעולה זו' });
    }
    
    next();
  };
}

// Usage
router.get('/motorcycles', 
  authorize(Permission.MOTORCYCLE_READ_ALL),
  motorcycleController.list
);
```

### 7.4 Data Security

**Encryption:**
- **In Transit:** TLS 1.3 for all communications
- **At Rest:** PostgreSQL native encryption (if available) or disk-level encryption
- **Sensitive Fields:** No PII beyond phone numbers (no credit cards, no passwords)

**Data Sanitization:**
```typescript
class DataSanitizer {
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential XSS
      return input
        .replace(/[<>]/g, '')
        .trim();
    }
    
    if (typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }
  
  sanitizePhoneNumber(phone: string): string {
    // Only allow digits, +, and common separators
    return phone.replace(/[^\d+\-() ]/g, '');
  }
}
```

**SQL Injection Prevention:**
- Use Prisma ORM (parameterized queries)
- Never construct raw SQL with user input
- Input validation at API layer

### 7.5 Rate Limiting

**Strategy:**

```typescript
const rateLimitConfig = {
  // Per phone number
  perUser: {
    windowMs: 60 * 1000, // 1 minute
    max: 20 // 20 requests per minute
  },
  
  // Global (all users)
  global: {
    windowMs: 60 * 1000,
    max: 200 // 200 requests per minute total
  },
  
  // Admin specific (higher limit)
  admin: {
    windowMs: 60 * 1000,
    max: 50
  }
};

class RateLimiter {
  private store: Map<string, number[]> = new Map();
  
  async checkLimit(key: string, config: RateLimitConfig): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get existing requests
    let requests = this.store.get(key) || [];
    
    // Filter to current window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check limit
    if (requests.length >= config.max) {
      return false; // Rate limit exceeded
    }
    
    // Add current request
    requests.push(now);
    this.store.set(key, requests);
    
    return true;
  }
}
```

### 7.6 Security Checklist

**Pre-Launch Security Audit:**

- [ ] All endpoints require authentication
- [ ] Authorization checks on all protected resources
- [ ] Input validation on all user inputs
- [ ] SQL injection tests passed
- [ ] XSS vulnerability tests passed
- [ ] Rate limiting implemented and tested
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include PII
- [ ] Database backups encrypted
- [ ] Environment variables properly secured
- [ ] WhatsApp webhook signature validation
- [ ] HTTPS enforced (no HTTP)
- [ ] Security headers configured (HSTS, CSP, etc.)

---

## 8. Technology Stack

### 8.1 Stack Overview

```mermaid
graph TB
    subgraph "Frontend/Client"
        WA[WhatsApp<br/>Mobile App]
    end
    
    subgraph "Backend Stack"
        Runtime[Node.js 20 LTS<br/>TypeScript 5.x]
        Framework[Express.js 4.x<br/>REST API]
        ORM[Prisma 5.x<br/>Type-Safe ORM]
    end
    
    subgraph "Data Stack"
        DB[PostgreSQL 15<br/>Supabase]
        Cache[In-Memory Cache<br/>Node Cache]
    end
    
    subgraph "External Services"
        WA_API[WhatsApp API<br/>Twilio/360dialog]
        Monitor[Sentry<br/>Error Tracking]
    end
    
    subgraph "DevOps"
        Git[Git/GitHub<br/>Version Control]
        CI[GitHub Actions<br/>CI/CD]
        Deploy[Railway/Render<br/>Hosting]
    end
    
    WA --> WA_API
    WA_API --> Framework
    Framework --> Runtime
    Runtime --> ORM
    ORM --> DB
    Framework --> Cache
    Framework --> Monitor
    Git --> CI
    CI --> Deploy
    Deploy --> Runtime
    
    style Runtime fill:#68A063
    style Framework fill:#000000
    style DB fill:#336791
    style WA_API fill:#25D366
```

### 8.2 Technology Decisions

#### Backend Framework: Node.js + Express.js + TypeScript

**Why Node.js:**
- Single language (TypeScript) for entire stack
- Excellent async I/O for webhook handling
- Rich ecosystem for WhatsApp integrations
- Fast development iteration
- Team familiarity (assumed)

**Why Express.js:**
- Minimal, unopinionated framework
- Mature and stable
- Excellent middleware ecosystem
- Easy testing
- Low learning curve

**Why TypeScript:**
- Type safety reduces bugs
- Better IDE support
- Self-documenting code
- Easier refactoring
- Industry standard

#### Database: PostgreSQL via Supabase

**Why PostgreSQL:**
- Robust ACID compliance (critical for fleet data)
- Excellent JSON support (conversation state)
- Rich query capabilities
- Open source
- Mature and proven

**Why Supabase:**
- Generous free tier (500MB DB)
- Managed PostgreSQL (less ops overhead)
- Built-in backups
- RESTful API (if needed later)
- Real-time capabilities (Phase 2)
- Easy migration path

**Alternatives Considered:**
- **MySQL:** Less robust JSON support
- **MongoDB:** ACID compliance concerns for financial data
- **SQLite:** Not suitable for concurrent users

#### ORM: Prisma

**Why Prisma:**
- Type-safe database access
- Excellent TypeScript integration
- Schema migrations built-in
- Query builder is intuitive
- Great developer experience
- Active development

```typescript
// Example Prisma schema
model Motorcycle {
  id                      String              @id @default(uuid())
  licensePlate            String              @unique @map("license_plate")
  type                    MotorcycleType
  currentMileage          Int                 @map("current_mileage")
  nextMaintenanceMileage  Int?                @map("next_maintenance_mileage")
  nextMaintenanceType     MaintenanceType?    @map("next_maintenance_type")
  
  assignedCourier         Courier?            @relation(fields: [assignedCourierId], references: [id])
  assignedCourierId       String?             @map("assigned_courier_id")
  
  mileageReports          MileageReport[]
  maintenanceHistory      MaintenanceHistory[]
  
  createdAt               DateTime            @default(now()) @map("created_at")
  updatedAt               DateTime            @updatedAt @map("updated_at")
  
  @@map("motorcycles")
}
```

#### WhatsApp Integration: Twilio vs 360dialog

**Evaluation Criteria:**

| Feature | Twilio | 360dialog |
|---------|--------|-----------|
| **Pricing** | $0.005/conversation | €0.0042/conversation |
| **Free Tier** | $15 credit | Sandbox available |
| **Setup Complexity** | Medium | Medium |
| **Documentation** | Excellent | Good |
| **Support** | 24/7 | Business hours |
| **Features** | Full API | Full API |
| **Reliability** | 99.95% SLA | 99.9% SLA |

**Decision:** Start with **Twilio Sandbox** for MVP (free), evaluate both before production.

#### Hosting: Railway vs Render

**Evaluation:**

| Feature | Railway | Render |
|---------|---------|--------|
| **Free Tier** | $5 credit/month | 750 hours/month |
| **Deployment** | Git push | Git push |
| **Database** | Plugin available | Managed PostgreSQL |
| **Ease of Use** | Excellent | Excellent |
| **Scaling** | Auto | Auto |
| **Price (Paid)** | $5/month + usage | $7/month + usage |

**Decision:** **Railway** for MVP (simpler setup), migrate to Render if needed.

### 8.3 Development Tools

**Code Quality:**
- **ESLint:** Linting
- **Prettier:** Code formatting
- **Husky:** Pre-commit hooks
- **Jest:** Unit testing
- **Supertest:** API testing

**Development Environment:**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "migrate": "prisma migrate dev",
    "studio": "prisma studio"
  }
}
```

---

## 9. Deployment Architecture

### 9.1 Deployment Diagram

```mermaid
graph TB
    subgraph "Production Environment - Railway"
        subgraph "Application Layer"
            App1[Speedy API<br/>Container 1]
            App2[Speedy API<br/>Container 2<br/>Auto-scale]
        end
        
        LB[Load Balancer<br/>Railway Internal]
    end
    
    subgraph "Database Layer - Supabase"
        Primary[(PostgreSQL<br/>Primary)]
        Replica[(PostgreSQL<br/>Read Replica)]
    end
    
    subgraph "External Services"
        WA[WhatsApp API<br/>Twilio]
        Sentry[Sentry<br/>Error Tracking]
        CF[Cloudflare<br/>DNS + CDN]
    end
    
    Internet[Internet] --> CF
    CF --> LB
    LB --> App1
    LB --> App2
    
    App1 --> Primary
    App2 --> Primary
    App1 -.->|Read Only| Replica
    App2 -.->|Read Only| Replica
    
    App1 --> WA
    App2 --> WA
    App1 --> Sentry
    App2 --> Sentry
    
    style App1 fill:#4A90E2
    style App2 fill:#4A90E2
    style Primary fill:#2ECC71
    style Replica fill:#95E1D3
```

### 9.2 Infrastructure as Code

**Railway Configuration (railway.toml):**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
name = "speedy-api"
source = "."

[services.env]
NODE_ENV = "production"
PORT = "3000"

[[services.volumes]]
mountPath = "/app/logs"
```

**Dockerfile:**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

### 9.3 Environment Configuration

**Environment Variables:**

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@host:5432/speedy

# WhatsApp API
WHATSAPP_API_URL=https://api.twilio.com/2010-04-01
WHATSAPP_ACCOUNT_SID=ACxxxxx
WHATSAPP_AUTH_TOKEN=xxxxx
WHATSAPP_PHONE_NUMBER=+972xxxxxxxxx

# Security
WEBHOOK_SECRET=xxxxx
JWT_SECRET=xxxxx (if needed later)
ENCRYPTION_KEY=xxxxx (if needed)

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production

# Features
ENABLE_RATE_LIMITING=true
ENABLE_DETAILED_LOGGING=false
MAX_CONCURRENT_REQUESTS=50
```

### 9.4 Deployment Pipeline

```mermaid
graph LR
    A[Developer<br/>Push Code] --> B[GitHub<br/>Repository]
    B --> C{GitHub Actions<br/>CI Pipeline}
    C --> D[Run Tests]
    D --> E{Tests Pass?}
    E -->|No| F[Notify Team]
    E -->|Yes| G[Build Docker Image]
    G --> H[Push to Registry]
    H --> I[Deploy to Railway]
    I --> J[Health Check]
    J --> K{Healthy?}
    K -->|No| L[Rollback]
    K -->|Yes| M[Update DNS]
    M --> N[Deployment Complete]
    
    style E fill:#F39C12
    style K fill:#F39C12
    style N fill:#2ECC71
    style F fill:#E74C3C
    style L fill:#E74C3C
```

**GitHub Actions Workflow:**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: speedy_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/speedy_test
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: speedy-api
```

### 9.5 Rollback Strategy

**Automated Rollback Triggers:**
- Health check fails after deployment
- Error rate > 5% within 5 minutes
- Response time > 5 seconds average
- Manual trigger by ops team

**Rollback Process:**
```bash
# Railway CLI rollback
railway rollback --service speedy-api --to <previous-deployment-id>

# Or via API
curl -X POST https://backboard.railway.app/v2/service/rollback \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -d '{"serviceId": "xxx", "deploymentId": "xxx"}'
```

---

## 10. Scalability & Performance

### 10.1 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Response Time** | < 3s (p95) | From webhook receipt to WhatsApp reply sent |
| **Throughput** | 50 req/min | Peak concurrent messages |
| **Database Query** | < 100ms (p95) | Individual query execution |
| **Uptime** | 99% | During business hours (6 AM - 10 PM) |
| **Error Rate** | < 1% | Failed message processing |

### 10.2 Scalability Strategy

**Current Scale (MVP):**
- 20 motorcycles
- 11 users (10 couriers + 1 admin)
- ~100 messages/day
- Single instance sufficient

**Target Scale (1 Year):**
- 100 motorcycles
- 50+ users
- ~500 messages/day
- 2-3 instances with load balancing

**Scaling Dimensions:**

```mermaid
graph TB
    subgraph "Vertical Scaling - Instance Size"
        V1[512MB RAM<br/>0.5 CPU]
        V2[1GB RAM<br/>1 CPU]
        V3[2GB RAM<br/>2 CPU]
    end
    
    subgraph "Horizontal Scaling - Instance Count"
        H1[1 Instance]
        H2[2 Instances]
        H3[3+ Instances]
    end
    
    subgraph "Database Scaling"
        D1[Single Instance]
        D2[Read Replicas]
        D3[Connection Pooling]
    end
    
    V1 -->|Growth| V2
    V2 -->|Growth| V3
    H1 -->|Traffic| H2
    H2 -->|Traffic| H3
    D1 -->|Load| D2
    D2 -->|Optimization| D3
```

**Scaling Triggers:**

| Trigger | Action |
|---------|--------|
| CPU > 70% for 5 min | Scale up instance size |
| Memory > 80% | Scale up instance size |
| Response time > 3s (p95) | Add instance (horizontal) |
| DB connections > 80% | Enable connection pooling |
| DB CPU > 70% | Add read replica |

### 10.3 Caching Strategy

**Cache Layers:**

```typescript
// 1. In-Memory Cache (Node-Cache)
class CacheService {
  private cache = new NodeCache({
    stdTTL: 600, // 10 minutes default
    checkperiod: 120 // Check for expired keys every 2 minutes
  });
  
  // Cache user context (hot path)
  async getUserContext(phone: string): Promise<AuthContext> {
    const cacheKey = `user:${phone}`;
    let context = this.cache.get<AuthContext>(cacheKey);
    
    if (!context) {
      context = await this.userService.authenticate(phone);
      this.cache.set(cacheKey, context, 3600); // 1 hour
    }
    
    return context;
  }
  
  // Cache courier motorcycles (hot path)
  async getCourierMotorcycles(courierId: string): Promise<Motorcycle[]> {
    const cacheKey = `courier:${courierId}:motorcycles`;
    let motorcycles = this.cache.get<Motorcycle[]>(cacheKey);
    
    if (!motorcycles) {
      motorcycles = await this.motorcycleService.getAssigned(courierId);
      this.cache.set(cacheKey, motorcycles, 300); // 5 minutes
    }
    
    return motorcycles;
  }
  
  // Invalidate on updates
  invalidateMotorcycleCache(courierId: string) {
    this.cache.del(`courier:${courierId}:motorcycles`);
  }
}
```

**Cache Invalidation Strategy:**
- **User Context:** Invalidate on role change
- **Motorcycles List:** Invalidate on assignment change or mileage update
- **Conversation State:** No cache (always fresh from DB)

### 10.4 Database Optimization

**Connection Pooling:**

```typescript
// Prisma connection pool configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  __internal: {
    engine: {
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    },
  },
});
```

**Index Strategy:**
- All foreign keys indexed
- Phone numbers (unique + indexed)
- Frequently queried fields (type, next_maintenance_mileage)
- Composite indexes for common query patterns

**Query Optimization:**
```typescript
// BAD: N+1 query problem
async function getMotorcyclesWithCouriers() {
  const motorcycles = await prisma.motorcycle.findMany();
  
  for (const m of motorcycles) {
    m.courier = await prisma.courier.findUnique({ where: { id: m.assignedCourierId }});
  }
  
  return motorcycles;
}

// GOOD: Single query with join
async function getMotorcyclesWithCouriers() {
  return await prisma.motorcycle.findMany({
    include: {
      assignedCourier: true,
      assignedClient: true
    }
  });
}
```

### 10.5 Performance Monitoring

**Key Metrics to Track:**

```typescript
interface PerformanceMetrics {
  // Application metrics
  requestDuration: Histogram;
  requestCount: Counter;
  activeConnections: Gauge;
  errorRate: Counter;
  
  // Business metrics
  messagesProcessed: Counter;
  mileageReportsCreated: Counter;
  maintenanceCalculations: Counter;
  
  // Database metrics
  dbQueryDuration: Histogram;
  dbConnectionPoolSize: Gauge;
  dbConnectionsActive: Gauge;
  
  // External service metrics
  whatsappApiLatency: Histogram;
  whatsappApiErrors: Counter;
}
```

---

## 11. Monitoring & Operations

### 11.1 Monitoring Strategy

```mermaid
graph TB
    subgraph "Application"
        App[Speedy API]
    end
    
    subgraph "Metrics Collection"
        AppLogs[Application Logs<br/>Winston]
        ErrorTracking[Error Tracking<br/>Sentry]
        Metrics[Metrics<br/>Custom + Sentry]
    end
    
    subgraph "Aggregation & Analysis"
        Sentry[Sentry Dashboard]
        Logs[Log Aggregation]
    end
    
    subgraph "Alerting"
        Slack[Slack Notifications]
        Email[Email Alerts]
    end
    
    App --> AppLogs
    App --> ErrorTracking
    App --> Metrics
    
    AppLogs --> Logs
    ErrorTracking --> Sentry
    Metrics --> Sentry
    
    Sentry --> Slack
    Sentry --> Email
    
    style Sentry fill:#E74C3C
    style App fill:#4A90E2
```

### 11.2 Logging Strategy

**Log Levels:**
- **ERROR:** Application errors, failed operations
- **WARN:** Degraded performance, retry attempts
- **INFO:** Business events (mileage reported, user logged in)
- **DEBUG:** Detailed execution flow (dev/staging only)

**Structured Logging:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'speedy-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Usage
logger.info('Mileage reported', {
  courierId: courier.id,
  motorcycleId: motorcycle.id,
  mileage: reportedMileage,
  nextMaintenance: result.nextMileage
});

logger.error('Failed to process webhook', {
  error: error.message,
  stack: error.stack,
  webhookId: message.id,
  phoneNumber: message.from
});
```

**Log Retention:**
- Production: 30 days
- Staging: 7 days
- Development: 1 day

### 11.3 Error Tracking with Sentry

**Configuration:**

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove phone numbers from logs
    if (event.request?.data) {
      event.request.data = sanitizePhoneNumbers(event.request.data);
    }
    return event;
  },
  
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ]
});

// Express middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Error Categorization:**

```typescript
// Business logic errors
class BusinessError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

// Validation errors
class ValidationError extends BusinessError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

// Usage
Sentry.captureException(error, {
  tags: {
    errorType: error instanceof BusinessError ? 'business' : 'system',
    component: 'maintenance-calculator'
  },
  contexts: {
    motorcycle: {
      id: motorcycle.id,
      type: motorcycle.type,
      mileage: motorcycle.currentMileage
    }
  }
});
```

### 11.4 Health Checks

**Endpoint Implementation:**

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      whatsapp: 'unknown',
      memory: 'unknown'
    }
  };
  
  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }
  
  // Memory check
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = memPercent < 90 ? 'ok' : 'warning';
  
  if (health.status === 'degraded') {
    return res.status(503).json(health);
  }
  
  res.json(health);
});

// Liveness probe (simpler)
app.get('/health/live', (req, res) => {
  res.status(200).send('OK');
});

// Readiness probe
app.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('OK');
  } catch {
    res.status(503).send('NOT READY');
  }
});
```

### 11.5 Alerting Rules

**Critical Alerts (Immediate Response):**

| Alert | Condition | Action |
|-------|-----------|--------|
| Service Down | Health check fails 3 times in 5 min | Page on-call engineer |
| Error Rate Spike | Error rate > 5% for 5 min | Slack notification + investigate |
| Database Down | Cannot connect to DB | Page on-call + escalate |
| High Response Time | p95 > 10s for 5 min | Investigate performance |

**Warning Alerts (Review Within Hours):**

| Alert | Condition | Action |
|-------|-----------|--------|
| Memory High | Memory > 85% | Slack notification |
| Disk Space Low | Disk > 80% | Slack notification |
| Rate Limit Hit | Rate limit exceeded 10+ times | Review usage patterns |
| WhatsApp API Errors | API error rate > 2% | Check external service status |

### 11.6 Backup & Recovery

**Backup Strategy:**

```typescript
// Automated via Supabase (daily backups included)
// Additional manual backup script

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function backupDatabase() {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `speedy-backup-${timestamp}.sql`;
  
  try {
    // Export database
    await execAsync(
      `pg_dump ${process.env.DATABASE_URL} > /backups/${filename}`
    );
    
    // Compress
    await execAsync(`gzip /backups/${filename}`);
    
    // Upload to S3/Cloud Storage (optional)
    // await uploadToS3(`/backups/${filename}.gz`);
    
    logger.info('Database backup completed', { filename });
  } catch (error) {
    logger.error('Database backup failed', { error });
    Sentry.captureException(error);
  }
}

// Schedule: Daily at 2 AM
// cron: '0 2 * * *'
```

**Recovery Plan:**

```mermaid
graph TD
    A[Disaster Detected] --> B{Data Loss?}
    B -->|Yes| C[Identify Last Good Backup]
    B -->|No| D[Restore from Latest]
    
    C --> E[Restore Database]
    D --> E
    
    E --> F[Verify Data Integrity]
    F --> G{Data Valid?}
    
    G -->|No| H[Try Previous Backup]
    H --> E
    
    G -->|Yes| I[Restart Services]
    I --> J[Run Health Checks]
    J --> K{All Checks Pass?}
    
    K -->|No| L[Debug Issues]
    L --> I
    
    K -->|Yes| M[Resume Operations]
    M --> N[Post-Incident Review]
    
    style A fill:#E74C3C
    style M fill:#2ECC71
```

**RTO/RPO Targets:**

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 24 hours (daily backups)
- **Data Loss Acceptable:** < 1 day of data

---

## 12. Development Strategy

### 12.1 Development Phases

**Phase 1: Foundation (Weeks 1-2)**

```mermaid
gantt
    title MVP Development Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Project Setup           :p1, 2025-10-23, 2d
    Database Schema         :p2, after p1, 2d
    Auth & User Service     :p3, after p2, 3d
    Basic Webhook Handler   :p4, after p3, 3d
    
    section Phase 2
    Bot Engine Core         :p5, after p4, 4d
    Fleet Service           :p6, after p5, 3d
    Maintenance Calculator  :p7, after p6, 3d
    
    section Phase 3
    Courier Flows           :p8, after p7, 3d
    Admin Flows             :p9, after p8, 4d
    Testing & Bug Fixes     :p10, after p9, 4d
    
    section Phase 4
    Deployment Setup        :p11, after p10, 2d
    Data Migration          :p12, after p11, 2d
    UAT                     :p13, after p12, 3d
    Production Launch       :p14, after p13, 1d
```

**Deliverables:**
- [ ] PostgreSQL schema deployed
- [ ] Authentication working
- [ ] Basic webhook receiving messages
- [ ] Unit tests for core components

**Phase 2: Core Business Logic (Weeks 3-4)**

**Deliverables:**
- [ ] Bot conversation engine
- [ ] Fleet CRUD operations
- [ ] Maintenance calculation logic
- [ ] Integration tests

**Phase 3: User Flows (Weeks 5-6)**

**Deliverables:**
- [ ] Courier mileage reporting flow
- [ ] Admin management flows
- [ ] Hebrew UI/UX complete
- [ ] End-to-end tests

**Phase 4: Deployment & Launch (Week 7-8)**

**Deliverables:**
- [ ] Production environment setup
- [ ] Data migration completed
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Production launch

### 12.2 Project Structure

```
speedy/
├── src/
│   ├── index.ts                    # Application entry point
│   ├── config/
│   │   ├── database.ts             # Prisma client
│   │   ├── whatsapp.ts             # WhatsApp API config
│   │   └── logger.ts               # Winston logger
│   ├── api/
│   │   ├── routes/
│   │   │   ├── webhook.routes.ts   # WhatsApp webhook
│   │   │   └── health.routes.ts    # Health checks
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   └── controllers/
│   │       └── webhook.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── bot/
│   │   │   ├── bot.service.ts
│   │   │   ├── conversation.manager.ts
│   │   │   ├── state.machine.ts
│   │   │   ├── menu.builder.ts
│   │   │   └── response.generator.ts
│   │   ├── fleet/
│   │   │   ├── motorcycle.service.ts
│   │   │   ├── courier.service.ts
│   │   │   └── client.service.ts
│   │   ├── maintenance/
│   │   │   ├── calculator.service.ts
│   │   │   ├── scheduler.service.ts
│   │   │   └── history.service.ts
│   │   ├── whatsapp/
│   │   │   ├── whatsapp.client.ts
│   │   │   └── message.formatter.ts
│   │   └── cache.service.ts
│   ├── repositories/
│   │   ├── motorcycle.repository.ts
│   │   ├── courier.repository.ts
│   │   ├── user.repository.ts
│   │   └── maintenance.repository.ts
│   ├── models/
│   │   ├── dto/                    # Data Transfer Objects
│   │   ├── entities/               # Domain entities
│   │   └── enums/
│   ├── utils/
│   │   ├── phone.utils.ts
│   │   ├── date.utils.ts
│   │   ├── hebrew.utils.ts
│   │   └── validation.utils.ts
│   └── types/
│       └── index.d.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
├── scripts/
│   ├── migrate.ts
│   └── backup.ts
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── Dockerfile
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── package.json
└── README.md
```

### 12.3 Coding Standards

**TypeScript Configuration:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**ESLint Configuration:**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

**Naming Conventions:**

- **Files:** kebab-case (`motorcycle.service.ts`)
- **Classes:** PascalCase (`MotorcycleService`)
- **Interfaces:** PascalCase with `I` prefix optional (`IMotorcycle` or `Motorcycle`)
- **Functions:** camelCase (`calculateNextMaintenance`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Enums:** PascalCase for enum, UPPER_SNAKE_CASE for values

### 12.4 Testing Strategy

**Test Pyramid:**

```mermaid
graph TB
    subgraph "Test Pyramid"
        E2E[E2E Tests<br/>10%<br/>Full flows]
        Integration[Integration Tests<br/>30%<br/>Service interactions]
        Unit[Unit Tests<br/>60%<br/>Functions & logic]
    end
    
    Unit --> Integration
    Integration --> E2E
    
    style Unit fill:#2ECC71
    style Integration fill:#3498DB
    style E2E fill:#9B59B6
```

**Unit Tests:**

```typescript
// tests/unit/services/maintenance/calculator.test.ts
import { MaintenanceCalculator } from '@/services/maintenance/calculator.service';

describe('MaintenanceCalculator', () => {
  let calculator: MaintenanceCalculator;
  
  beforeEach(() => {
    calculator = new MaintenanceCalculator();
  });
  
  describe('125cc motorcycle', () => {
    it('should calculate first small maintenance at 4000km', () => {
      const result = calculator.calculate125Cycle(500, []);
      
      expect(result.type).toBe('SMALL');
      expect(result.nextMileage).toBe(4000);
      expect(result.dueIn).toBe(3500);
    });
    
    it('should follow Small-Small-Large pattern', () => {
      const history = [
        { type: 'SMALL', mileage: 4000 },
        { type: 'SMALL', mileage: 8000 }
      ];
      
      const result = calculator.calculate125Cycle(8500, history);
      
      expect(result.type).toBe('LARGE');
      expect(result.nextMileage).toBe(12000);
    });
  });
  
  describe('250cc motorcycle', () => {
    it('should alternate Small and Large', () => {
      const history = [
        { type: 'SMALL', mileage: 5000 }
      ];
      
      const result = calculator.calculate250Cycle(6000, history);
      
      expect(result.type).toBe('LARGE');
      expect(result.nextMileage).toBe(10000);
    });
  });
  
  describe('Electric motorcycle', () => {
    it('should return no maintenance needed', () => {
      const motorcycle = { type: 'ELECTRIC', currentMileage: 5000 };
      
      const result = calculator.calculateNextMaintenance(motorcycle, 5000);
      
      expect(result.type).toBe('NONE');
      expect(result.nextMileage).toBeNull();
    });
  });
});
```

**Integration Tests:**

```typescript
// tests/integration/api/webhook.test.ts
import request from 'supertest';
import { app } from '@/index';
import { prisma } from '@/config/database';

describe('Webhook API', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  beforeEach(async () => {
    // Clean database
    await prisma.mileageReport.deleteMany();
    await prisma.motorcycle.deleteMany();
    await prisma.courier.deleteMany();
  });
  
  describe('POST /webhook', () => {
    it('should process mileage report from courier', async () => {
      // Arrange: Create courier and motorcycle
      const courier = await prisma.courier.create({
        data: {
          name: 'Test Courier',
          phoneNumber: '+972501234567',
          user: {
            create: {
              phoneNumber: '+972501234567',
              role: 'COURIER'
            }
          }
        }
      });
      
      const motorcycle = await prisma.motorcycle.create({
        data: {
          licensePlate: '123456',
          type: '125',
          currentMileage: 3000,
          assignedCourierId: courier.id,
          // ... other required fields
        }
      });
      
      // Act: Send WhatsApp message
      const response = await request(app)
        .post('/webhook')
        .send({
          from: '+972501234567',
          type: 'text',
          text: { body: '5000' },
          // ... WhatsApp message structure
        });
      
      // Assert
      expect(response.status).toBe(200);
      
      const updatedMotorcycle = await prisma.motorcycle.findUnique({
        where: { id: motorcycle.id }
      });
      
      expect(updatedMotorcycle.currentMileage).toBe(5000);
      expect(updatedMotorcycle.nextMaintenanceMileage).toBe(8000);
    });
  });
});
```

**E2E Tests:**

```typescript
// tests/e2e/courier-flow.test.ts
import { WhatsAppSimulator } from './helpers/whatsapp-simulator';

describe('Courier Mileage Reporting Flow', () => {
  let simulator: WhatsAppSimulator;
  
  beforeEach(() => {
    simulator = new WhatsAppSimulator('+972501234567');
  });
  
  it('should complete full mileage reporting flow', async () => {
    // Step 1: Courier starts conversation
    await simulator.sendMessage('שלום');
    let response = await simulator.waitForResponse();
    expect(response.text).toContain('מה תרצה לעשות');
    expect(response.buttons).toContain('דווח קילומטר');
    
    // Step 2: Select report mileage
    await simulator.clickButton('דווח קילומטר');
    response = await simulator.waitForResponse();
    expect(response.text).toContain('על איזה אופנוע');
    
    // Step 3: Select motorcycle
    await simulator.clickButton('123456');
    response = await simulator.waitForResponse();
    expect(response.text).toContain('מה הקילומטר הנוכחי');
    
    // Step 4: Enter mileage
    await simulator.sendMessage('15000');
    response = await simulator.waitForResponse();
    expect(response.text).toContain('נשמר בהצלחה');
    expect(response.text).toContain('15,000');
  });
});
```

**Test Coverage Target:**
- Overall: > 80%
- Critical paths (maintenance calculation, auth): > 95%
- Services: > 85%
- Controllers: > 70%

### 12.5 Code Review Guidelines

**PR Checklist:**

- [ ] Code follows style guide (ESLint passes)
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] No hardcoded credentials
- [ ] Migrations included (if DB changes)
- [ ] Performance impact considered
- [ ] Security implications reviewed

**Review Focus Areas:**
1. **Security:** Auth, input validation, SQL injection
2. **Performance:** Query efficiency, caching
3. **Maintainability:** Code clarity, documentation
4. **Testing:** Coverage, test quality
5. **Business Logic:** Correctness of maintenance calculations

---

## 13. Risk Assessment

### 13.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **WhatsApp API rate limits exceeded** | Medium | High | Implement queuing, monitor usage, upgrade plan early |
| **Database connection pool exhaustion** | Low | High | Connection pooling, monitoring, auto-scaling |
| **Free tier limits exceeded** | Medium | Medium | Cost monitoring, migration plan to paid tier |
| **Maintenance calculation bugs** | Medium | Critical | Extensive unit tests, manual verification, phased rollout |
| **Data loss** | Low | Critical | Daily backups, transaction integrity, rollback capability |
| **WhatsApp service outage** | Low | High | Graceful degradation, queue messages, user communication |
| **Security breach** | Low | Critical | Regular security audits, penetration testing, principle of least privilege |

### 13.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **No 24/7 support** | High | Medium | Clear escalation process, comprehensive monitoring, self-healing where possible |
| **Single developer** | High | High | Comprehensive documentation, simple architecture, code reviews |
| **Deployment failures** | Medium | Medium | Automated rollback, blue-green deployment, staging environment |
| **Vendor dependency** | Low | Medium | Avoid vendor lock-in, clear migration paths |

### 13.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low user adoption** | Medium | High | User training, simple UX, responsive support |
| **Incorrect maintenance calculations** | Low | Critical | Thorough testing, gradual rollout, manual override capability |
| **Data privacy concerns** | Low | Medium | Clear privacy policy, minimal data collection, secure storage |
| **Scope creep** | High | Medium | Strict MVP definition, phase 2 planning, change control |

### 13.4 Contingency Plans

**Plan A: WhatsApp API Failure**
1. Detect: Health check fails
2. Queue: Store incoming messages
3. Notify: Alert admin via alternative channel
4. Fallback: SMS gateway (if available)
5. Recover: Process queue when service restored

**Plan B: Database Failure**
1. Detect: Connection failures
2. Alert: Page on-call engineer
3. Restore: From latest backup
4. Verify: Data integrity checks
5. Resume: Restart services

**Plan C: Critical Bug in Production**
1. Detect: Error spike in Sentry
2. Assess: Impact and severity
3. Decision: Rollback vs hotfix
4. Execute: Deploy fix or revert
5. Verify: Monitoring and testing
6. Document: Post-mortem analysis

---

## 14. Success Criteria

### 14.1 MVP Launch Criteria

**Technical:**
- [ ] All unit tests passing (>80% coverage)
- [ ] All integration tests passing
- [ ] E2E tests for critical flows passing
- [ ] Performance benchmarks met (<3s response time)
- [ ] Security audit completed
- [ ] Load testing completed (50 concurrent users)
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested

**Functional:**
- [ ] Couriers can report mileage successfully
- [ ] Admin can manage all fleet entities
- [ ] Maintenance calculations accurate for all types
- [ ] Hebrew UI complete and RTL-compliant
- [ ] Phone-based auth working
- [ ] Historical data preserved

**Operational:**
- [ ] Deployment pipeline working
- [ ] Documentation complete
- [ ] Runbooks for common issues
- [ ] On-call process defined
- [ ] User training materials ready

### 14.2 Post-Launch Success Metrics

**Week 1:**
- [ ] 100% couriers onboarded
- [ ] 80% daily active courier rate
- [ ] <1% error rate
- [ ] <3s average response time
- [ ] Zero data loss incidents

**Month 1:**
- [ ] 90% daily active courier rate
- [ ] Admin using system for 100% of fleet management
- [ ] Zero missed maintenance windows
- [ ] Zero expired documents
- [ ] <5 support requests per week

**Month 3:**
- [ ] 50% reduction in admin time spent on fleet management
- [ ] 100% data accuracy
- [ ] Positive user feedback (>4/5 rating)
- [ ] System uptime >99%
- [ ] Ready for Phase 2 features

---

## 15. Conclusion & Next Steps

### 15.1 Architecture Summary

Speedy is designed as a **cost-effective, scalable, and maintainable** fleet management system with:

✅ **Modular monolith** architecture for simplicity
✅ **PostgreSQL + Prisma** for data integrity and type safety
✅ **WhatsApp-first** interface for user accessibility
✅ **Phone-based auth** for security without complexity
✅ **Intelligent maintenance engine** as core business logic
✅ **Comprehensive monitoring** for operational excellence
✅ **Clear scaling path** from 20 to 200+ motorcycles

### 15.2 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Monolith over Microservices** | Simplicity, lower ops overhead, faster development |
| **PostgreSQL via Supabase** | ACID compliance, generous free tier, managed service |
| **TypeScript + Express** | Type safety, mature ecosystem, team productivity |
| **Phone-based auth** | Leverages WhatsApp security, no password management |
| **In-memory cache** | Simple, effective for MVP scale |
| **Railway hosting** | Cost-effective, easy deployment, good DX |

### 15.3 Implementation Roadmap

**Immediate Next Steps:**
1. **Week 1:** Set up repository, database schema, basic auth
2. **Week 2-3:** Build bot engine and maintenance calculator
3. **Week 4-5:** Implement courier and admin flows
4. **Week 6:** Testing, bug fixes, performance optimization
5. **Week 7:** Deployment, data migration, UAT
6. **Week 8:** Production launch and monitoring

**Phase 2 Planning (Month 3-6):**
- Proactive notifications
- Photo uploads
- Enhanced reporting
- Web dashboard (optional)

### 15.4 Open Questions for Product Team

1. **WhatsApp Provider:** Twilio vs 360dialog final decision?
2. **Hosting:** Railway vs Render preference?
3. **Admin Access:** Should admin also receive daily/weekly summaries?
4. **Data Retention:** How long to keep historical mileage reports?
5. **Future Features:** Priority order for Phase 2?

### 15.5 Approval & Sign-off

**This HLD requires approval from:**

- [ ] **CTO:** Architecture and technology choices
- [ ] **VP R&D:** Development strategy and timelines
- [ ] **Product Manager:** Feature scope and priorities
- [ ] **Lead Developer:** Technical feasibility
- [ ] **DevOps Lead:** Deployment and operations strategy

---

## Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **MVP** | Minimum Viable Product - first version with core features |
| **RTL** | Right-to-Left (Hebrew text direction) |
| **ORM** | Object-Relational Mapping (Prisma) |
| **ACID** | Atomicity, Consistency, Isolation, Durability (database properties) |
| **RTO** | Recovery Time Objective |
| **RPO** | Recovery Point Objective |
| **SLA** | Service Level Agreement |
| **FSM** | Finite State Machine |

### Appendix B: Reference Architecture Examples

**Similar Systems:**
- Uber fleet management (inspiration for scalability)
- Delivery tracking bots (UX patterns)
- Maintenance scheduling systems (business logic)

### Appendix C: Useful Resources

**Documentation:**
- Prisma: https://www.prisma.io/docs
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- Supabase: https://supabase.com/docs
- Railway: https://docs.railway.app

**Libraries:**
- Express.js: https://expressjs.com
- Winston (logging): https://github.com/winstonjs/winston
- Joi (validation): https://joi.dev
- Jest (testing): https://jestjs.io

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Next Review:** After MVP Launch

**END OF HIGH-LEVEL DESIGN DOCUMENT**