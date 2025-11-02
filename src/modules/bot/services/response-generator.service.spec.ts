/**
 * Response Generator Service - Unit Tests
 *
 * Comprehensive tests for Hebrew text response generation with RTL support.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ResponseGeneratorService } from './response-generator.service';

describe('ResponseGeneratorService', () => {
  let service: ResponseGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseGeneratorService]
    }).compile();

    service = module.get<ResponseGeneratorService>(ResponseGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateWelcomeMessage', () => {
    it('should generate welcome message with user name', () => {
      const result = service.generateWelcomeMessage('ישראל');

      expect(result).toContain('\u200F'); // RTL mark
      expect(result).toContain('שלום ישראל!');
      expect(result).toContain('ברוך הבא לבוט ניהול צי האופנועים של ספידי');
    });

    it('should handle custom options', () => {
      const result = service.generateWelcomeMessage('דוד', { rtl: false });

      expect(result).not.toContain('\u200F');
      expect(result).toContain('שלום דוד!');
    });
  });

  describe('generateErrorMessage', () => {
    it('should generate generic error message', () => {
      const error = { code: 'INTERNAL_ERROR', message: 'Database connection failed' };
      const result = service.generateErrorMessage(error);

      expect(result).toContain('\u200F'); // RTL mark
      expect(result).toContain('❌ שגיאה:');
      expect(result).toContain('שגיאה פנימית במערכת');
    });

    it('should use custom user message', () => {
      const error = {
        code: 'INVALID_MILEAGE',
        message: 'Invalid mileage value',
        userMessage: 'ערך קילומטראז\' לא תקין!'
      };
      const result = service.generateErrorMessage(error);

      expect(result).toContain('ערך קילומטראז\' לא תקין!');
      expect(result).toContain('אנא הכנס מספר חיובי עד 999,999');
    });

    it('should handle menu selection errors', () => {
      const error = { code: 'INVALID_MENU_SELECTION', message: 'Invalid selection' };
      const result = service.generateErrorMessage(error);

      expect(result).toContain('בחירה לא תקינה');
      expect(result).toContain('אנא בחר מספר מהתפריט');
    });

    it('should handle conversation expired errors', () => {
      const error = { code: 'CONVERSATION_EXPIRED', message: 'Conversation expired' };
      const result = service.generateErrorMessage(error);

      expect(result).toContain('השיחה פגה');
      expect(result).toContain('אנא התחל שיחה חדשה');
    });
  });

  describe('generateSuccessMessage', () => {
    it('should generate generic success message', () => {
      const result = service.generateSuccessMessage('generic_action');

      expect(result).toContain('\u200F'); // RTL mark
      expect(result).toContain('✅ הפעולה הושלמה בהצלחה!');
    });

    it('should generate mileage reported success message', () => {
      const result = service.generateSuccessMessage('mileage_reported', {
        mileage: 15000,
        motorcycleId: 'motorcycle-123'
      });

      expect(result).toContain('✅ דיווח קילומטראז\' הושלם!');
      expect(result).toContain('15,000');
      expect(result).toContain('motorcycle-123');
    });

    it('should generate maintenance recorded success message', () => {
      const result = service.generateSuccessMessage('maintenance_recorded', {
        maintenanceType: 'SMALL',
        mileage: 15000
      });

      expect(result).toContain('✅ תחזוקה נרשמה בהצלחה!');
      expect(result).toContain('SMALL');
      expect(result).toContain('15,000');
    });

    it('should generate motorcycle assigned success message', () => {
      const result = service.generateSuccessMessage('motorcycle_assigned', {
        licensePlate: '123-45-67',
        courierName: 'ישראל ישראלי'
      });

      expect(result).toContain('✅ אופנוע הוקצה בהצלחה!');
      expect(result).toContain('123-45-67');
      expect(result).toContain('ישראל ישראלי');
    });

    it('should generate conversation ended success message', () => {
      const result = service.generateSuccessMessage('conversation_ended');

      expect(result).toContain('✅ השיחה הסתיימה');
      expect(result).toContain('תודה על השימוש בבוט של ספידי');
    });
  });

  describe('generateMotorcycleInfo', () => {
    it('should generate motorcycle information message', () => {
      const motorcycle = {
        licensePlate: '123-45-67',
        type: 'MOTORCYCLE_125',
        currentMileage: 15000,
        licenseExpiryDate: new Date('2025-12-31'),
        insuranceExpiryDate: new Date('2025-06-30'),
        insuranceType: 'SINGLE_DRIVER',
        isActive: true,
        assignedCourier: { name: 'ישראל ישראלי' },
        assignedClient: { name: 'חברה לדוגמה' }
      };

      const result = service.generateMotorcycleInfo(motorcycle);

      expect(result).toContain('\u200F'); // RTL mark
      expect(result).toContain('🏍️ פרטי אופנוע:');
      expect(result).toContain('123-45-67');
      expect(result).toContain('125 סמ״ק');
      expect(result).toContain('15,000');
      expect(result).toContain('ישראל ישראלי');
      expect(result).toContain('חברה לדוגמה');
      expect(result).toContain('פעיל');
    });

    it('should handle missing optional fields', () => {
      const motorcycle = {
        licensePlate: '123-45-67',
        type: 'MOTORCYCLE_250',
        currentMileage: 25000,
        isActive: false
      };

      const result = service.generateMotorcycleInfo(motorcycle);

      expect(result).toContain('250 סמ״ק');
      expect(result).toContain('25,000');
      expect(result).toContain('לא פעיל');
      expect(result).toContain('לא צוין'); // For missing dates
    });
  });

  describe('generateMaintenanceReminder', () => {
    it('should generate maintenance reminder with upcoming maintenance', () => {
      const maintenanceData = {
        nextMaintenance: {
          type: 'SMALL',
          nextMileage: 16000,
          dueIn: 1000
        }
      };

      const result = service.generateMaintenanceReminder(maintenanceData);

      expect(result).toContain('\u200F'); // RTL mark
      expect(result).toContain('🟢 תחזוקה מתוכננת:');
      expect(result).toContain('תחזוקה קטנה');
      expect(result).toContain('1,000 ק"מ');
      expect(result).toContain('16,000');
    });

    it('should show urgency indicators', () => {
      const maintenanceData = {
        nextMaintenance: {
          type: 'LARGE',
          nextMileage: 16000,
          dueIn: 50 // Very close
        }
      };

      const result = service.generateMaintenanceReminder(maintenanceData);

      expect(result).toContain('🔴 תחזוקה מתוכננת:'); // Red indicator for close maintenance
    });

    it('should generate overdue maintenance reminders', () => {
      const maintenanceData = {
        overdueMaintenance: [
          { type: 'SMALL', dueIn: -500 },
          { type: 'LARGE', dueIn: -200 }
        ]
      };

      const result = service.generateMaintenanceReminder(maintenanceData);

      expect(result).toContain('🔴 תחזוקה באיחור:');
      expect(result).toContain('500 ק"מ באיחור');
      expect(result).toContain('200 ק"מ באיחור');
    });

    it('should generate no maintenance message', () => {
      const maintenanceData = {};

      const result = service.generateMaintenanceReminder(maintenanceData);

      expect(result).toContain('✅ אין תחזוקה מתוכננת');
    });
  });

  describe('generateMenuMessage', () => {
    it('should generate menu message with options', () => {
      const menu = {
        id: 'test-menu',
        title: 'תפריט בדיקה',
        options: [
          { key: '1', label: 'אפשרות ראשונה', enabled: true },
          { key: '2', label: 'אפשרות שנייה', enabled: true },
          { key: '3', label: 'אפשרות שלישית', enabled: false }
        ],
        footer: 'בחר אפשרות'
      };

      const result = service.generateMenuMessage(menu);

      expect(result).toContain('\u200Fתפריט בדיקה'); // RTL mark
      expect(result).toContain('1. אפשרות ראשונה');
      expect(result).toContain('2. אפשרות שנייה');
      expect(result).not.toContain('3. אפשרות שלישית'); // Disabled option
      expect(result).toContain('בחר אפשרות');
    });
  });

  describe('formatHebrewText', () => {
    it('should add RTL mark when rtl option is true', () => {
      const result = service.formatHebrewText('שלום עולם', { rtl: true });

      expect(result).toBe('\u200Fשלום עולם');
    });

    it('should not add RTL mark when rtl option is false', () => {
      const result = service.formatHebrewText('שלום עולם', { rtl: false });

      expect(result).toBe('שלום עולם');
    });

    it('should add direction markers when requested', () => {
      const result = service.formatHebrewText('שלום', {
        rtl: true,
        includeDirectionMarkers: true
      });

      expect(result).toBe('\u202B\u200Fשלום\u202C');
    });

    it('should format numbers in Hebrew when requested', () => {
      const result = service.formatHebrewText('Price: 123', {
        rtl: true,
        formatNumbers: true
      });

      expect(result).toBe('\u200FPrice: ١٢٣');
    });
  });

  describe('additional methods', () => {
    describe('generateStatusMessage', () => {
      it('should generate processing status', () => {
        const result = service.generateStatusMessage('processing');

        expect(result).toContain('⏳ מעבד את הבקשה...');
      });

      it('should generate timeout status', () => {
        const result = service.generateStatusMessage('conversation_timeout');

        expect(result).toContain('⏰ השיחה פגה');
      });

      it('should generate rate limited status with wait time', () => {
        const result = service.generateStatusMessage('rate_limited', { waitTime: 120 });

        expect(result).toContain('120 שניות');
      });
    });

    describe('generateHelpMessage', () => {
      it('should generate comprehensive help message', () => {
        const result = service.generateHelpMessage();

        expect(result).toContain('📚 עזרה - בוט ניהול צי אופנועים');
        expect(result).toContain('פקודות זמינות:');
        expect(result).toContain('דווח קילומטראז\'');
        expect(result).toContain('לשליחים:');
        expect(result).toContain('למנהלים:');
      });
    });

    describe('generateConfirmationPrompt', () => {
      it('should generate mileage confirmation prompt', () => {
        const result = service.generateConfirmationPrompt('report_mileage', {
          mileage: 15000,
          licensePlate: '123-45-67'
        });

        expect(result).toContain('האם אתה בטוח');
        expect(result).toContain('15,000');
        expect(result).toContain('123-45-67');
        expect(result).toContain('1. כן - אשר');
        expect(result).toContain('2. לא - בטל');
      });

      it('should generate maintenance confirmation prompt', () => {
        const result = service.generateConfirmationPrompt('record_maintenance', {
          maintenanceType: 'LARGE',
          mileage: 30000
        });

        expect(result).toContain('תחזוקה גדולה');
        expect(result).toContain('30,000');
      });

      it('should generate end conversation confirmation', () => {
        const result = service.generateConfirmationPrompt('end_conversation');

        expect(result).toContain('האם אתה בטוח שברצונך לסיים את השיחה?');
      });
    });
  });

  describe('private methods', () => {
    it('should return correct motorcycle type labels', () => {
      // Test through public method that uses private one
      const motorcycle = { type: 'MOTORCYCLE_125' };
      const result = service.generateMotorcycleInfo(motorcycle);

      expect(result).toContain('125 סמ״ק');
    });

    it('should return correct maintenance type labels', () => {
      // Test through maintenance reminder
      const maintenanceData = {
        nextMaintenance: { type: 'LARGE', nextMileage: 30000, dueIn: 1000 }
      };
      const result = service.generateMaintenanceReminder(maintenanceData);

      expect(result).toContain('תחזוקה גדולה');
    });
  });
});
