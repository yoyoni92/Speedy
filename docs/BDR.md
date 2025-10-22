# Speedy - Business Requirements Document (BRD)

**Project Name:** Speedy  
**Document Version:** 1.0  
**Date:** October 22, 2025  
**Document Owner:** CTO / Product Lead  
**Status:** Draft for Technical Review

---

## Executive Summary

**Speedy** is a WhatsApp-based fleet management chatbot designed for motorcycle courier staffing companies. The system enables real-time tracking of motorcycle maintenance schedules, legal compliance (insurance, annual tests), and operational data through a simple, Hebrew-language conversational interface.

### Key Objectives
- Simplify fleet management for non-technical users
- Proactive maintenance scheduling based on mileage and motorcycle type
- Ensure legal compliance (insurance validity, annual tests, licenses)
- Centralized data management replacing scattered documents
- Enable future business intelligence from courier reports

### Success Criteria
- 100% of couriers can report mileage without training
- Admin can manage entire fleet operations via WhatsApp
- Zero missed maintenance windows or expired documents
- System operational cost ≤ $100/month for MVP

---

## 1. Business Context

### 1.1 Problem Statement

**Current State:**
- Fleet management is handled through scattered documents (Excel, paper, various files)
- No systematic tracking of maintenance schedules, insurance expiry, or test dates
- Reactive approach leads to:
  - Missed maintenance windows
  - Expired insurance or annual tests
  - Potential legal and operational risks
  - Administrative overhead and manual tracking burden

**Impact:**
- Operational inefficiency
- Compliance risks
- Increased costs from emergency repairs
- Management time wasted on manual tracking

### 1.2 Proposed Solution

A WhatsApp chatbot that serves as a centralized fleet management system with:
- **For Couriers:** Simple mileage reporting interface
- **For Admin:** Complete fleet management capabilities
- **For System:** Intelligent maintenance scheduling based on motorcycle type and usage patterns

### 1.3 Why Now?

- Client initiative to streamline daily operations
- Small fleet size (20 motorcycles) ideal for MVP validation
- Growing digital transformation in courier industry
- WhatsApp ubiquity among target users

---

## 2. Stakeholders & Users

### 2.1 Primary Stakeholders

| Stakeholder | Role | Interest |
|------------|------|----------|
| Fleet Manager (Admin) | System administrator | Operational efficiency, compliance, cost reduction |
| Couriers | End users | Simple reporting, minimal friction |
| Client Companies | Service recipients | Reliable courier service, compliance |
| Business Owner | Decision maker | ROI, scalability, business insights |

### 2.2 User Personas

#### Persona 1: Admin (Fleet Manager)
- **Name:** David
- **Age:** 35-50
- **Tech Proficiency:** Low-Medium
- **Goals:** 
  - Manage 20 motorcycles efficiently
  - Ensure compliance (insurance, tests)
  - Track maintenance schedules
  - Minimize administrative overhead
- **Pain Points:**
  - Scattered information across multiple documents
  - Manual tracking is time-consuming
  - Fear of missing critical deadlines
- **Needs:**
  - Intuitive interface in Hebrew
  - Complete visibility of fleet status
  - Easy data entry and updates

#### Persona 2: Courier (Motorcycle Driver)
- **Name:** Matan
- **Age:** 22-40
- **Tech Proficiency:** Low
- **Goals:**
  - Report mileage quickly
  - Focus on deliveries, not paperwork
- **Pain Points:**
  - Doesn't want complex systems
  - Limited time between deliveries
  - Prefers mobile-first solutions
- **Needs:**
  - Ultra-simple reporting (1-2 clicks)
  - No learning curve
  - Hebrew interface

---

## 3. Scope & Requirements

### 3.1 MVP Scope (Phase 1)

#### In Scope ✅
- WhatsApp interface for all users (couriers + admin)
- Reactive bot (responds to user input, no proactive notifications)
- Courier mileage reporting
- Admin fleet management (CRUD operations for motorcycles, couriers, clients)
- Maintenance scheduling logic based on motorcycle type
- Data persistence and history tracking
- Hebrew language interface with button-based navigation
- Cost-effective infrastructure (target: $0-100/month)

#### Out of Scope ❌
- Proactive notifications/alerts (Phase 2)
- Web dashboard (Phase 2)
- Multi-language support (Hebrew only for MVP)
- Payment processing
- Photo uploads (Phase 2)
- Advanced analytics/reporting (Phase 2)
- Integration with external systems

### 3.2 Functional Requirements

#### FR-1: User Authentication & Authorization

**FR-1.1:** User identification by phone number
- Couriers and admin identified automatically via WhatsApp phone number
- Phone numbers pre-registered in system by admin
- Unauthorized numbers receive "access denied" message

**FR-1.2:** Role-based access control
- **Courier Role:** Can only report mileage on assigned motorcycles
- **Admin Role:** Full access to all system functions

#### FR-2: Courier Functions

**FR-2.1:** Mileage Reporting
- Courier initiates chat → Bot presents menu with buttons
- Courier selects "Report Mileage" → Bot displays list of assigned motorcycles
- Courier selects motorcycle → Bot prompts for current mileage
- Courier enters number → Bot validates and saves
- Bot confirms successful save with summary
- Bot calculates next maintenance milestone automatically

**User Flow:**
```
Courier → "Start"
Bot → [Button Menu: "דווח קילומטר" | "עזרה"]
Courier → Clicks "דווח קילומטר"
Bot → "על איזה אופנוע?" [List of assigned motorcycles]
Courier → Selects motorcycle (e.g., "125 - 488162")
Bot → "מה הקילומטר הנוכחי?"
Courier → "12450"
Bot → "✓ נשמר בהצלחה! קילומטר נוכחי: 12,450. טיפול הבא ב-16,000 ק״מ"
```

#### FR-3: Admin Functions

**FR-3.1:** Motorcycle Management
- Add new motorcycle (license plate, type, insurance details, test date)
- Update motorcycle details
- View motorcycle details
- Assign motorcycle to courier
- View maintenance history

**FR-3.2:** Courier Management
- Add new courier (name, phone number)
- Update courier details
- View courier details
- Assign/unassign motorcycles to couriers
- View courier activity history

**FR-3.3:** Client Management
- Add new client company
- Update client details
- View client details
- Assign couriers to clients

**FR-3.4:** Data Viewing & Reports
- View all motorcycles with status summary
- View motorcycles by maintenance status
- View upcoming maintenance schedules
- View expired/expiring documents (insurance, tests)
- Export data (Phase 2)

**Admin User Flow Example:**
```
Admin → "Start"
Bot → [Button Menu: "ניהול אופנועים" | "ניהול שליחים" | "ניהול לקוחות" | "דוחות"]
Admin → Clicks "ניהול אופנועים"
Bot → [Button Menu: "הוסף אופנוע" | "עדכן אופנוע" | "צפה ברשימה"]
Admin → Clicks "הוסף אופנוע"
Bot → Guides through data entry step-by-step
```

#### FR-4: Maintenance Logic Engine

**Critical Business Logic:**

**FR-4.1:** Motorcycle Types & Maintenance Schedules

| Type | Maintenance Pattern | Cycle |
|------|-------------------|-------|
| **125cc** | Small → Small → Large | Small: every 4,000 km<br>Large: every 4,000 km after last small |
| **250cc** | Small → Large (alternating) | Small: 5,000 km<br>Large: 5,000 km |
| **Electric** | No maintenance required | N/A |

**Example for 125cc:**
```
0 km → First Small at 4,000 km
4,000 km → Second Small at 8,000 km
8,000 km → Large at 12,000 km
12,000 km → Small at 16,000 km
16,000 km → Small at 20,000 km
20,000 km → Large at 24,000 km
(Pattern repeats: Small, Small, Large)
```

**FR-4.2:** Automatic Calculation
- System calculates next maintenance milestone on every mileage update
- Calculation based on motorcycle type and current maintenance history
- Next maintenance type and mileage stored in database
- History of all maintenances preserved

#### FR-5: Data Model

**Entity: Motorcycle**
- `id` (unique identifier)
- `license_plate` (מספר רישיון)
- `type` (125 / 250 / Electric)
- `model` (optional - דגם)
- `year` (optional - שנת ייצור)
- `license_expiry_date` (תוקף רישיון)
- `insurance_expiry_date` (תוקף ביטוח)
- `insurance_type` (נהג יחיד / כל נהג)
- `current_mileage` (ק״מ נוכחי)
- `next_maintenance_mileage` (טיפול הבא ק״מ)
- `next_maintenance_type` (Small / Large)
- `assigned_courier_id` (foreign key)
- `assigned_client_id` (foreign key)
- `created_at`
- `updated_at`

**Entity: Courier**
- `id` (unique identifier)
- `name` (שם)
- `phone_number` (מספר טלפון - unique, used for auth)
- `assigned_client_id` (foreign key)
- `created_at`
- `updated_at`

**Entity: Client**
- `id` (unique identifier)
- `name` (שם לקוח)
- `created_at`
- `updated_at`

**Entity: Maintenance_History**
- `id` (unique identifier)
- `motorcycle_id` (foreign key)
- `maintenance_type` (Small / Large)
- `mileage_at_maintenance` (ק״מ בזמן הטיפול)
- `performed_date` (תאריך)
- `notes` (optional)
- `created_at`

**Entity: Mileage_Report**
- `id` (unique identifier)
- `motorcycle_id` (foreign key)
- `courier_id` (foreign key)
- `reported_mileage` (ק״מ מדווח)
- `reported_at` (timestamp)

**Entity: User**
- `id` (unique identifier)
- `phone_number` (unique - WhatsApp identifier)
- `role` (admin / courier)
- `linked_courier_id` (foreign key - null for admin)
- `created_at`

#### FR-6: User Experience Requirements

**FR-6.1:** Language
- All user-facing text in Hebrew
- Right-to-left (RTL) text formatting
- Hebrew date formats (DD/MM/YYYY)
- Hebrew number formatting with thousands separator (e.g., 12,450)

**FR-6.2:** Interface Design
- Button-based navigation (no free text commands)
- Maximum 3-4 buttons per message
- Clear, concise button labels
- Confirmation messages after actions
- Error messages in plain Hebrew

**FR-6.3:** Accessibility
- Simple language suitable for low-literacy users
- Visual hierarchy with emojis where appropriate
- Step-by-step guided flows
- Back/Cancel options in multi-step flows

### 3.3 Non-Functional Requirements

#### NFR-1: Performance
- Response time < 3 seconds for any user action
- Support 10 concurrent users minimum
- Handle 100+ messages per day

#### NFR-2: Reliability
- 99% uptime during business hours (6 AM - 10 PM IST)
- Data persistence guaranteed (no data loss)
- Automatic backup daily

#### NFR-3: Security
- Phone number-based authentication
- No sensitive data exposed in WhatsApp messages
- Data encryption at rest
- HTTPS/TLS for all API communications

#### NFR-4: Scalability
- Architecture supports growth to 100 motorcycles
- Database design supports 1000+ historical records

#### NFR-5: Maintainability
- Clean, documented codebase
- Modular architecture for easy updates
- Logging and error tracking

---

## 4. User Flows

### 4.1 Courier Flow: Report Mileage

```
START
  ↓
[Courier sends any message to bot]
  ↓
[Bot: "שלום [Name]! מה תרצה לעשות?"]
[Buttons: "דווח קילומטר" | "עזרה"]
  ↓
[Courier clicks: "דווח קילומטר"]
  ↓
[Bot: "על איזה אופנוע?"]
[Buttons: List of assigned motorcycles]
  ↓
[Courier selects motorcycle]
  ↓
[Bot: "מה הקילומטר הנוכחי של [License Plate]?"]
  ↓
[Courier types number: "12450"]
  ↓
[Bot validates input]
  ├─ Invalid → [Bot: "אנא הזן מספר תקין"]
  └─ Valid → [Bot calculates next maintenance]
      ↓
[Bot: "✓ נשמר בהצלחה!
קילומטר נוכחי: 12,450
טיפול הבא: טיפול גדול ב-16,000 ק״מ"]
  ↓
END
```

### 4.2 Admin Flow: Add New Motorcycle

```
START
  ↓
[Admin sends message]
  ↓
[Bot: Main Menu]
[Buttons: "ניהול אופנועים" | "ניהול שליחים" | "ניהול לקוחות" | "דוחות"]
  ↓
[Admin clicks: "ניהול אופנועים"]
  ↓
[Bot: "מה תרצה לעשות?"]
[Buttons: "הוסף אופנוע" | "עדכן אופנוע" | "צפה ברשימה" | "חזור"]
  ↓
[Admin clicks: "הוסף אופנוע"]
  ↓
[Bot: "מה מספר הרישיון?"]
  ↓
[Admin types: "488162"]
  ↓
[Bot: "מה סוג האופנוע?"]
[Buttons: "125" | "250" | "חשמלי"]
  ↓
[Admin selects: "125"]
  ↓
[Bot: "מה תוקף הרישיון? (DD/MM/YYYY)"]
  ↓
[Admin types: "15/01/2026"]
  ↓
[Bot: "מה תוקף הביטוח? (DD/MM/YYYY)"]
  ↓
[Admin types: "30/04/2026"]
  ↓
[Bot: "מה סוג הביטוח?"]
[Buttons: "נהג יחיד" | "כל נהג"]
  ↓
[Admin selects: "כל נהג"]
  ↓
[Bot: "מה הקילומטר הנוכחי?"]
  ↓
[Admin types: "32800"]
  ↓
[Bot: "למי לשייך את האופנוע?"]
[Buttons: List of couriers + "אף אחד"]
  ↓
[Admin selects courier]
  ↓
[Bot calculates initial maintenance schedule]
  ↓
[Bot: "✓ אופנוע נוסף בהצלחה!
מספר רישיון: 488162
סוג: 125
קילומטר נוכחי: 32,800
טיפול הבא: טיפול גדול ב-36,000 ק״מ
משויך ל: מתן"]
  ↓
END
```

---

## 5. Success Metrics

### 5.1 Adoption Metrics
- **User Activation:** 100% of couriers report mileage within first week
- **Daily Active Users:** ≥3 courier interactions per day
- **Admin Usage:** Admin accesses system ≥5 times per week

### 5.2 Operational Metrics
- **Data Completeness:** 100% of motorcycles have up-to-date mileage data
- **Maintenance Compliance:** 0 missed maintenance windows after system launch
- **Document Compliance:** 0 expired insurance/tests/licenses

### 5.3 Technical Metrics
- **System Uptime:** ≥99% during business hours
- **Response Time:** <3 seconds average
- **Error Rate:** <1% of interactions
- **Data Accuracy:** 100% (no data corruption/loss)

### 5.4 Business Metrics
- **Time Saved:** 50% reduction in admin time spent on fleet management
- **Cost per motorcycle:** ≤$5/month operational cost
- **ROI Timeline:** Positive ROI within 3 months

---

## 6. Cost Analysis

### 6.1 Infrastructure Cost Comparison

#### Option 1: Free Tier Stack (Recommended for MVP)

| Component | Service | Monthly Cost | Notes |
|-----------|---------|--------------|-------|
| **WhatsApp API** | Twilio/360dialog Sandbox | $0 | Limited to 1,000 conversations/month |
| **Database** | Supabase Free Tier | $0 | 500MB storage, 2GB bandwidth |
| **Backend Hosting** | Railway/Render Free | $0 | 500 hours/month |
| **File Storage** | Supabase Storage | $0 | 1GB included |
| **Monitoring** | Sentry Free | $0 | 5K events/month |
| **TOTAL** | | **$0/month** | Suitable for MVP validation |

**Limitations:**
- No SLA guarantees
- Limited support
- Volume caps may require upgrade
- Uptime not guaranteed

---

#### Option 2: Production Ready (Paid Tier)

| Component | Service | Monthly Cost | Notes |
|-----------|---------|--------------|-------|
| **WhatsApp API** | 360dialog/Twilio | $25-40 | Conversation-based pricing |
| **Database** | Supabase Pro | $25 | 8GB storage, 50GB bandwidth |
| **Backend Hosting** | Railway Hobby/Render | $5-10 | Guaranteed uptime |
| **File Storage** | Included in DB | $0 | Part of Supabase Pro |
| **Monitoring** | Sentry Team | $26 | Advanced error tracking |
| **Backups** | Automated daily | Included | Part of infrastructure |
| **TOTAL** | | **$81-101/month** | Recommended for production |

**Benefits:**
- 99.9% uptime SLA
- Professional support
- Scalability headroom
- Advanced monitoring

---

#### Option 3: Self-Hosted (Cost Optimization)

| Component | Service | Monthly Cost | Notes |
|-----------|---------|--------------|-------|
| **VPS** | Hetzner/DigitalOcean | $6-12 | 2GB RAM, 50GB SSD |
| **WhatsApp API** | Pay-as-you-go | $25-40 | Same as other options |
| **Domain + SSL** | Cloudflare | $0-2 | Free SSL, optional domain |
| **Backups** | Hetzner Backup | $1-2 | Automated snapshots |
| **TOTAL** | | **$32-56/month** | Requires DevOps expertise |

**Trade-offs:**
- Lower cost, higher maintenance burden
- Requires technical expertise
- No managed support
- Full control over infrastructure

---

### 6.2 Cost Projection by Phase

```
Phase 1 (MVP - Months 1-3):
└─ Free Tier: $0/month
   └─ Focus: Validation, learning, stability

Phase 2 (Production - Month 4+):
└─ Production Ready: $85/month
   └─ Trigger: 5+ paying clients OR 50+ motorcycles

Phase 3 (Scale - Future):
└─ Enterprise: $150-200/month
   └─ Trigger: 100+ motorcycles OR multiple organizations
```

### 6.3 Cost per Unit Economics

**At Production Scale (20 motorcycles):**
- Total Cost: $85/month
- Cost per Motorcycle: $4.25/month
- Cost per Active User (11 users): $7.73/month

**At Scale (100 motorcycles):**
- Total Cost: ~$150/month
- Cost per Motorcycle: $1.50/month
- Cost per Active User (50 users): $3/month

### 6.4 Cost Recommendation

**For MVP Launch:**
- Start with **Free Tier** ($0/month)
- Validate product-market fit
- Monitor usage and performance
- Plan migration to Production tier at Month 3-4

**Migration Trigger Points:**
- Consistent 500+ WhatsApp conversations/month
- Client requests for SLA guarantees
- Need for advanced monitoring/support
- Approaching free tier limits

---

## 7. Technical Constraints

### 7.1 Platform Constraints
- **WhatsApp only:** No SMS, email, or other channels in MVP
- **Message limits:** WhatsApp Business API rate limits apply
- **Media:** No image/file uploads in MVP (Phase 2)
- **Language:** Hebrew only (RTL support required)

### 7.2 Infrastructure Constraints
- **Budget:** Target $0-100/month operational cost
- **Scalability:** Must support 10x growth without architecture change
- **Hosting:** Prefer managed services over self-hosted

### 7.3 Integration Constraints
- **No external APIs:** All functionality self-contained in MVP
- **No payment processing:** No financial transactions
- **No third-party integrations:** Focus on core functionality

### 7.4 Data Constraints
- **Data residency:** No specific requirements (can use international hosting)
- **Backup:** Daily backups minimum
- **Retention:** Historical data retained indefinitely

---

## 8. Phased Roadmap

### Phase 1: MVP (Current Scope)
**Timeline:** Immediate (Weeks 1-8)

**Core Features:**
- ✅ WhatsApp bot interface (Hebrew)
- ✅ Courier mileage reporting
- ✅ Admin fleet management (CRUD)
- ✅ Maintenance logic engine
- ✅ Phone-based authentication
- ✅ Data persistence & history

**Success Criteria:**
- System operational
- All 10 couriers onboarded and reporting
- Admin managing fleet entirely via WhatsApp
- Zero data loss incidents

---

### Phase 2: Enhanced Operations (Future)
**Timeline:** Months 3-6

**Features:**
- 🔔 **Proactive notifications**
  - Maintenance due alerts
  - Insurance/test expiry warnings
  - Weekly/monthly summaries
- 📸 **Photo uploads**
  - Odometer photos for verification
  - Damage reporting with images
- 📊 **Enhanced reporting**
  - Export data to Excel
  - Visual charts and trends
  - Client-specific reports
- 🌐 **Web dashboard** (optional)
  - Admin portal for complex operations
  - Advanced filtering and search
  - Bulk operations

---

### Phase 3: Business Intelligence (Future)
**Timeline:** Months 6-12

**Features:**
- 📈 **Analytics & Insights**
  - Courier performance metrics
  - Cost per kilometer analysis
  - Maintenance cost tracking
  - Predictive maintenance (ML)
- 🔗 **Integrations**
  - Accounting system integration
  - Client company APIs
  - Google Calendar for maintenance
- 🚀 **Scale Features**
  - Multi-organization support
  - White-label capabilities
  - API for third-party integrations

---

## 9. Risks & Mitigations

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WhatsApp API rate limits | Medium | High | Monitor usage, implement queuing |
| Free tier limits exceeded | High | Medium | Plan migration to paid tier at Month 3 |
| Data loss | Low | Critical | Daily backups, data validation |
| Poor performance | Medium | Medium | Load testing before launch, caching strategy |

### 9.2 User Adoption Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Couriers resist new system | Medium | High | Training, onboarding support, incentives |
| Admin finds interface too complex | Low | High | User testing, iterative UX improvements |
| Language barriers | Low | Medium | Clear Hebrew interface, voice support (Phase 2) |

### 9.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Client doesn't see ROI | Low | Critical | Track time savings, demonstrate compliance value |
| Operational costs exceed budget | Medium | Medium | Cost monitoring, optimization opportunities |
| Scalability issues at growth | Low | High | Architecture designed for 10x growth |

---

## 10. Assumptions & Dependencies

### 10.1 Assumptions
- ✅ All couriers have smartphones with WhatsApp
- ✅ Couriers can read and write Hebrew
- ✅ Reliable mobile internet connectivity
- ✅ Admin available for initial data migration
- ✅ Current fleet data is available and accurate

### 10.2 Dependencies
- **WhatsApp Business API access** (must be approved)
- **Initial data migration** (existing fleet data from client)
- **Phone numbers collection** (all couriers + admin)
- **Client availability** for UAT and feedback

### 10.3 Out of Scope (Explicitly)
- ❌ Multi-language support (English, Arabic, etc.)
- ❌ Voice interface / phone calls
- ❌ Integration with garage/service providers
- ❌ GPS tracking of motorcycles
- ❌ Financial management (invoicing, payments)
- ❌ Employee management (payroll, scheduling)

---

## 11. Acceptance Criteria

### 11.1 Courier Acceptance Criteria
- [ ] Courier can report mileage in ≤3 taps
- [ ] Courier receives confirmation after successful report
- [ ] Courier can view list of assigned motorcycles
- [ ] Courier cannot access other couriers' motorcycles
- [ ] Interface is entirely in Hebrew with proper RTL formatting

### 11.2 Admin Acceptance Criteria
- [ ] Admin can add/edit/view motorcycles
- [ ] Admin can add/edit/view couriers
- [ ] Admin can add/edit/view clients
- [ ] Admin can view complete fleet status
- [ ] Admin can see maintenance schedules for all motorcycles
- [ ] Admin can see upcoming document expiries
- [ ] All operations completable via WhatsApp

### 11.3 System Acceptance Criteria
- [ ] Maintenance calculations are accurate for all motorcycle types
- [ ] Data persists across sessions (no data loss)
- [ ] System responds within 3 seconds
- [ ] System operates for 30 days with 99% uptime
- [ ] Historical data is preserved and queryable
- [ ] Unauthorized users cannot access system

### 11.4 Business Acceptance Criteria
- [ ] Operational cost ≤$100/month
- [ ] All 10 couriers onboarded and actively reporting
- [ ] Admin reports 50% time savings vs. previous method
- [ ] Zero missed maintenance or document expiries post-launch
- [ ] Client satisfaction score ≥8/10

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Courier** | Motorcycle delivery driver employed by staffing company |
| **Admin** | Fleet manager who oversees motorcycle operations |
| **Client** | Company receiving courier staffing services |
| **Small Maintenance** | Minor service (oil change, basic inspection) |
| **Large Maintenance** | Major service (comprehensive inspection, part replacements) |
| **125cc** | Motorcycle with 125cc engine displacement |
| **250cc** | Motorcycle with 250cc engine displacement |
| **Electric** | Electric-powered motorcycle (no combustion engine) |
| **License Expiry** | Date when motorcycle registration expires |
| **Insurance Expiry** | Date when motorcycle insurance policy expires |
| **Test Date** | Annual safety and emissions test required date |
| **נהג יחיד** | Insurance policy covering single designated driver |
| **כל נהג** | Insurance policy covering any driver |

---

## 13. Appendices

### Appendix A: Sample Data Structure

**Motorcycles Table (Sample):**
```json
{
  "id": "moto_001",
  "license_plate": "488162",
  "type": "125",
  "model": "Honda PCX",
  "year": 2023,
  "license_expiry_date": "2026-01-15",
  "insurance_expiry_date": "2026-04-30",
  "insurance_type": "כל נהג",
  "current_mileage": 32800,
  "next_maintenance_mileage": 36000,
  "next_maintenance_type": "Large",
  "assigned_courier_id": "courier_001",
  "assigned_client_id": "client_001",
  "created_at": "2025-10-01T10:00:00Z",
  "updated_at": "2025-10-22T14:30:00Z"
}
```

**Couriers Table (Sample):**
```json
{
  "id": "courier_001",
  "name": "מתן",
  "phone_number": "+972507390520",
  "assigned_client_id": "client_001",
  "created_at": "2025-10-01T10:00:00Z",
  "updated_at": "2025-10-01T10:00:00Z"
}
```

### Appendix B: Maintenance Calculation Examples

**Example 1: 125cc Motorcycle**
```
Starting mileage: 0 km
Maintenance history: None

Calculation:
- First maintenance: Small at 4,000 km
- Second maintenance: Small at 8,000 km
- Third maintenance: Large at 12,000 km
- Fourth maintenance: Small at 16,000 km
- Fifth maintenance: Small at 20,000 km
- Sixth maintenance: Large at 24,000 km
(Pattern repeats: S, S, L, S, S, L...)
```

**Example 2: 250cc Motorcycle**
```
Starting mileage: 10,250 km
Last maintenance: Large at 10,000 km

Calculation:
- Current cycle position: Just after Large
- Next maintenance: Small at 15,000 km
- Following maintenance: Large at 20,000 km
(Pattern alternates: S, L, S, L...)
```

### Appendix C: Conversation Flow Samples

See User Flows section (Section 4) for detailed conversation examples.

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Business Owner | ___________ | ___________ | ___________ |
| Product Manager | ___________ | ___________ | ___________ |
| Technical Lead | ___________ | ___________ | ___________ |
| Client Representative | ___________ | ___________ | ___________ |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | CTO | Initial draft for technical review |

---

**END OF DOCUMENT**

---

## Next Steps

1. **Review & Feedback:** Stakeholders review this BRD and provide feedback
2.