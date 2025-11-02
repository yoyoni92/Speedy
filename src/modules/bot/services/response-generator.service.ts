/**
 * Response Generator Service - Hebrew Text Response Generation
 *
 * Creates properly formatted Hebrew responses for the WhatsApp bot with RTL support.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IResponseGeneratorService } from '../interfaces/bot.interface';
import { ResponseOptions, BotMenu } from '../interfaces/bot.interface';

@Injectable()
export class ResponseGeneratorService implements IResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);

  /**
   * Generate welcome message
   */
  generateWelcomeMessage(userName: string, options?: ResponseOptions): string {
    const template = 'שלום {userName}! ברוך הבא לבוט ניהול צי האופנועים של ספידי.';

    return this.formatHebrewText(
      template.replace('{userName}', userName),
      { rtl: true, ...options }
    );
  }

  /**
   * Generate error message
   */
  generateErrorMessage(
    error: { code: string; message: string; userMessage?: string },
    options?: ResponseOptions
  ): string {
    const userMessage = error.userMessage || this.getDefaultErrorMessage(error.code);

    let template = '❌ שגיאה: {message}';

    if (error.code === 'INVALID_MILEAGE') {
      template = '❌ שגיאה בדיווח קילומטראז\': {message}\nאנא הכנס מספר חיובי עד 999,999.';
    } else if (error.code === 'INVALID_MENU_SELECTION') {
      template = '❌ בחירה לא תקינה: {message}\nאנא בחר מספר מהתפריט.';
    } else if (error.code === 'CONVERSATION_EXPIRED') {
      template = '❌ השיחה פגה: {message}\nאנא התחל שיחה חדשה.';
    }

    return this.formatHebrewText(
      template.replace('{message}', userMessage),
      { rtl: true, ...options }
    );
  }

  /**
   * Generate success message
   */
  generateSuccessMessage(
    action: string,
    data?: Record<string, any>,
    options?: ResponseOptions
  ): string {
    let template = '✅ הפעולה הושלמה בהצלחה!';

    switch (action) {
      case 'mileage_reported':
        const mileage = data?.mileage?.toLocaleString('he-IL') || '0';
        const motorcycleId = data?.motorcycleId || '';
        template = `✅ דיווח קילומטראז\' הושלם!\nקילומטראז\': ${mileage}\nאופנוע: ${motorcycleId}`;
        break;

      case 'maintenance_recorded':
        template = `✅ תחזוקה נרשמה בהצלחה!\nסוג: ${data?.maintenanceType || 'לא צוין'}\nקילומטראז\': ${data?.mileage?.toLocaleString('he-IL') || '0'}`;
        break;

      case 'motorcycle_assigned':
        template = `✅ אופנוע הוקצה בהצלחה!\nאופנוע: ${data?.licensePlate || ''}\nשליח: ${data?.courierName || ''}`;
        break;

      case 'conversation_ended':
        template = '✅ השיחה הסתיימה.\nתודה על השימוש בבוט של ספידי!\nלשיחה חדשה שלח הודעה.';
        break;

      case 'motorcycle_selected':
        template = `✅ אופנוע נבחר: ${data?.motorcycleId || ''}`;
        break;

      default:
        template = '✅ הפעולה הושלמה בהצלחה!';
    }

    return this.formatHebrewText(template, { rtl: true, ...options });
  }

  /**
   * Generate motorcycle information message
   */
  generateMotorcycleInfo(
    motorcycle: any,
    options?: ResponseOptions
  ): string {
    const info = [
      `🏍️ פרטי אופנוע:`,
      `מספר רישוי: ${motorcycle.licensePlate || 'לא צוין'}`,
      `סוג: ${this.getMotorcycleTypeLabel(motorcycle.type)}`,
      `קילומטראז\' נוכחי: ${motorcycle.currentMileage?.toLocaleString('he-IL') || '0'}`,
      `תוקף רישוי: ${motorcycle.licenseExpiryDate ? new Date(motorcycle.licenseExpiryDate).toLocaleDateString('he-IL') : 'לא צוין'}`,
      `תוקף ביטוח: ${motorcycle.insuranceExpiryDate ? new Date(motorcycle.insuranceExpiryDate).toLocaleDateString('he-IL') : 'לא צוין'}`,
      `סטטוס: ${motorcycle.isActive ? 'פעיל' : 'לא פעיל'}`
    ];

    if (motorcycle.assignedCourier) {
      info.push(`שליח: ${motorcycle.assignedCourier.name}`);
    }

    if (motorcycle.assignedClient) {
      info.push(`לקוח: ${motorcycle.assignedClient.name}`);
    }

    return this.formatHebrewText(info.join('\n'), { rtl: true, ...options });
  }

  /**
   * Generate maintenance reminder message
   */
  generateMaintenanceReminder(
    maintenanceData: any,
    options?: ResponseOptions
  ): string {
    const reminders = [];

    if (maintenanceData.nextMaintenance) {
      const next = maintenanceData.nextMaintenance;
      const dueIn = next.dueIn;

      let urgency = '🟢';
      if (dueIn < 500) urgency = '🟡';
      if (dueIn < 100) urgency = '🔴';

      reminders.push(
        `${urgency} תחזוקה מתוכננת:`,
        `סוג: ${this.getMaintenanceTypeLabel(next.type)}`,
        `בעוד: ${dueIn.toLocaleString('he-IL')} ק"מ`,
        `בקילומטראז\': ${(next.nextMileage || 0).toLocaleString('he-IL')}`
      );
    }

    if (maintenanceData.overdueMaintenance && maintenanceData.overdueMaintenance.length > 0) {
      reminders.push('\n🔴 תחזוקה באיחור:');
      maintenanceData.overdueMaintenance.forEach((item: any) => {
        reminders.push(`- ${this.getMaintenanceTypeLabel(item.type)} (${Math.abs(item.dueIn).toLocaleString('he-IL')} ק"מ באיחור)`);
      });
    }

    if (reminders.length === 0) {
      return this.formatHebrewText('✅ אין תחזוקה מתוכננת', { rtl: true, ...options });
    }

    return this.formatHebrewText(reminders.join('\n'), { rtl: true, ...options });
  }

  /**
   * Generate menu navigation message
   */
  generateMenuMessage(menu: BotMenu, options?: ResponseOptions): string {
    return this.formatHebrewText(menu.title, { rtl: true, ...options }) + '\n\n' +
           menu.options
             .filter(option => option.enabled)
             .map(option => `${option.key}. ${option.label}`)
             .join('\n') +
           (menu.footer ? '\n\n' + this.formatHebrewText(menu.footer, { rtl: true, ...options }) : '');
  }

  /**
   * Format Hebrew text with proper RTL support
   */
  formatHebrewText(text: string, options?: ResponseOptions): string {
    if (!options?.rtl) {
      return text;
    }

    // Add RTL mark at the beginning
    let formattedText = '\u200F' + text;

    // Format numbers if requested
    if (options.formatNumbers) {
      formattedText = this.formatNumbersInHebrew(formattedText);
    }

    // Add direction markers if requested
    if (options.includeDirectionMarkers) {
      formattedText = '\u202B' + formattedText + '\u202C';
    }

    return formattedText;
  }

  /**
   * Get default error message for error code
   */
  private getDefaultErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'INVALID_PHONE_NUMBER': 'מספר טלפון לא תקין',
      'USER_NOT_FOUND': 'משתמש לא נמצא',
      'UNAUTHORIZED': 'אין הרשאה לבצע פעולה זו',
      'MOTORCYCLE_NOT_FOUND': 'אופנוע לא נמצא',
      'COURIER_NOT_ASSIGNED': 'שליח לא משויך לאופנוע זה',
      'INVALID_MILEAGE': 'ערך קילומטראז\' לא תקין',
      'MAINTENANCE_CALCULATION_ERROR': 'שגיאה בחישוב תחזוקה',
      'INVALID_MAINTENANCE_TYPE': 'סוג תחזוקה לא תקין',
      'CONVERSATION_EXPIRED': 'השיחה פגה, אנא התחל שיחה חדשה',
      'INVALID_STATE_TRANSITION': 'מעבר לא חוקי בין מצבי שיחה',
      'WEBHOOK_VERIFICATION_FAILED': 'אימות webhook נכשל',
      'MESSAGE_SEND_FAILED': 'שליחת הודעה נכשלה',
      'VALIDATION_ERROR': 'שגיאת אימות נתונים',
      'DATABASE_ERROR': 'שגיאת מסד נתונים',
      'INTERNAL_ERROR': 'שגיאה פנימית במערכת'
    };

    return messages[code] || 'אירעה שגיאה לא צפויה';
  }

  /**
   * Get Hebrew label for motorcycle type
   */
  private getMotorcycleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'MOTORCYCLE_125': '125 סמ״ק',
      'MOTORCYCLE_250': '250 סמ״ק',
      'ELECTRIC': 'חשמלי'
    };

    return labels[type] || type;
  }

  /**
   * Get Hebrew label for maintenance type
   */
  private getMaintenanceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'NONE': 'ללא תחזוקה',
      'SMALL': 'תחזוקה קטנה',
      'LARGE': 'תחזוקה גדולה'
    };

    return labels[type] || type;
  }

  /**
   * Format numbers in Hebrew style (with Hebrew digits)
   */
  private formatNumbersInHebrew(text: string): string {
    const hebrewDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

    return text.replace(/\d/g, (digit) => {
      const num = parseInt(digit);
      return hebrewDigits[num] || digit; // Fallback to original digit if out of range
    });
  }

  /**
   * Generate status update message
   */
  generateStatusMessage(
    status: string,
    data?: Record<string, any>,
    options?: ResponseOptions
  ): string {
    let message = '';

    switch (status) {
      case 'processing':
        message = '⏳ מעבד את הבקשה...';
        break;

      case 'waiting_for_input':
        message = '⏳ ממתין לקלט מהמשתמש...';
        break;

      case 'conversation_timeout':
        message = '⏰ השיחה פגה בגלל חוסר פעילות. אנא התחל שיחה חדשה.';
        break;

      case 'system_maintenance':
        message = '🔧 המערכת בתחזוקה. אנא נסה שוב מאוחר יותר.';
        break;

      case 'rate_limited':
        message = `⏱️ יותר מדי בקשות. אנא המתן ${data?.waitTime || 60} שניות.`;
        break;

      default:
        message = `📊 סטטוס: ${status}`;
    }

    return this.formatHebrewText(message, { rtl: true, ...options });
  }

  /**
   * Generate help message
   */
  generateHelpMessage(options?: ResponseOptions): string {
    const helpText = [
      '📚 עזרה - בוט ניהול צי אופנועים',
      '',
      'פקודות זמינות:',
      '• דווח קילומטראז\' - דיווח קילומטראז\' לאופנוע',
      '• צפה בתחזוקה - צפה בלוח התחזוקה',
      '• 0 - סיים שיחה',
      '',
      'לשליחים:',
      '• דווח קילומטראז\' לאופנועים המשויכים אליך',
      '• צפה בתחזוקה הנדרשת',
      '',
      'למנהלים:',
      '• ניהול אופנועים וחלפים',
      '• ניהול משתמשי שליחים',
      '• צפה בדוחות וסטטיסטיקות',
      '',
      'לעזרה נוספת צור קשר עם המנהל.'
    ].join('\n');

    return this.formatHebrewText(helpText, { rtl: true, ...options });
  }

  /**
   * Generate confirmation prompt
   */
  generateConfirmationPrompt(
    action: string,
    data?: Record<string, any>,
    options?: ResponseOptions
  ): string {
    let prompt = '';

    switch (action) {
      case 'report_mileage':
        prompt = `האם אתה בטוח שברצונך לדווח קילומטראז\' של ${data?.mileage?.toLocaleString('he-IL') || '0'} לאופנוע ${data?.licensePlate || ''}?`;
        break;

      case 'record_maintenance':
        prompt = `האם אתה בטוח שברצונך לרשום ${this.getMaintenanceTypeLabel(data?.maintenanceType || '')} בקילומטראז\' ${data?.mileage?.toLocaleString('he-IL') || '0'}?`;
        break;

      case 'end_conversation':
        prompt = 'האם אתה בטוח שברצונך לסיים את השיחה?';
        break;

      default:
        prompt = `האם אתה בטוח שברצונך לבצע פעולה זו: ${action}?`;
    }

    prompt += '\n\n1. כן - אשר\n2. לא - בטל';

    return this.formatHebrewText(prompt, { rtl: true, ...options });
  }
}
