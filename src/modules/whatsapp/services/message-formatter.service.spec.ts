/**
 * Message Formatter Service - Unit Tests
 *
 * Tests for Hebrew text formatting, RTL support, and WhatsApp message preparation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MessageFormatterService } from './message-formatter.service';

describe('MessageFormatterService', () => {
  let service: MessageFormatterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageFormatterService],
    }).compile();

    service = module.get<MessageFormatterService>(MessageFormatterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('formatForWhatsApp', () => {
    it('should add RTL marker for Hebrew text', () => {
      const result = service.formatForWhatsApp('שלום עולם', { rtl: true });
      expect(result).toBe('\u200Fשלום עולם');
    });

    it('should not add RTL marker when rtl is false', () => {
      const result = service.formatForWhatsApp('שלום עולם', { rtl: false });
      expect(result).toBe('שלום עולם');
    });

    it('should not add RTL marker for non-Hebrew text', () => {
      const result = service.formatForWhatsApp('Hello World', { rtl: true });
      expect(result).toBe('Hello World');
    });

    it('should truncate text when maxLength is specified', () => {
      const longText = 'זהו טקסט ארוך מאוד שצריך לקצר';
      const result = service.formatForWhatsApp(longText, { maxLength: 20 });
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should preserve newlines when requested', () => {
      const text = 'שורה 1\nשורה 2\nשורה 3';
      const result = service.formatForWhatsApp(text, { preserveNewlines: true });
      expect(result).toBe('\u200Fשורה 1\nשורה 2\nשורה 3');
    });

    it('should limit consecutive newlines', () => {
      const text = 'שורה 1\n\n\n\nשורה 2';
      const result = service.formatForWhatsApp(text);
      expect(result).toBe('\u200Fשורה 1\n\nשורה 2');
    });
  });

  describe('normalizeHebrewText', () => {
    it('should normalize Hebrew quotation marks', () => {
      const result = service.formatForWhatsApp('טקסט עם ״גרשיים״');
      expect(result).not.toContain('״');
      expect(result).not.toContain('׳');
    });

    it('should handle Hebrew ligatures', () => {
      const text = 'כּבּפּ';
      const result = service.formatForWhatsApp(text, { rtl: false });
      expect(result).toBe('כבפ'); // Should remove dagesh marks
    });
  });

  describe('formatNumbersInHebrew', () => {
    it('should convert numbers to Eastern Arabic numerals', () => {
      const result = service.formatNumbersInHebrew('12345');
      expect(result).toBe('١٢٣٤٥');
    });

    it('should handle number input', () => {
      const result = service.formatNumbersInHebrew(12345);
      expect(result).toBe('١٢٣٤٥');
    });

    it('should convert all Western Arabic numerals', () => {
      const result = service.formatNumbersInHebrew('0-1-2-3-4-5-6-7-8-9');
      expect(result).toBe('٠-١-٢-٣-٤-٥-٦-٧-٨-٩');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with Hebrew numbers', () => {
      const result = service.formatCurrency(1500.50, '₪');
      expect(result).toContain('₪');
      expect(result).toContain('١,٥٠٠.٥'); // Hebrew locale formatting
    });

    it('should use default shekel symbol', () => {
      const result = service.formatCurrency(100);
      expect(result).toBe('١٠٠ ₪');
    });
  });

  describe('formatDate', () => {
    it('should format date in Hebrew locale', () => {
      const date = new Date('2024-01-15');
      const result = service.formatDate(date);
      expect(result).toContain('ינואר'); // Hebrew month name
      expect(result).toContain('2024');
    });

    it('should respect custom options', () => {
      const date = new Date('2024-01-15');
      const result = service.formatDate(date, { month: 'numeric', day: 'numeric' });
      expect(result).toMatch(/\d{1,2}\.\d{1,2}/); // Hebrew format uses dots
    });
  });

  describe('createInteractiveMessage', () => {
    it('should create button message', () => {
      const result = service.createInteractiveMessage({
        header: 'כותרת',
        body: 'גוף ההודעה',
        footer: 'כותרת תחתונה',
        buttons: [
          { id: 'yes', title: 'כן' },
          { id: 'no', title: 'לא' },
        ],
      });

      expect(result.type).toBe('button');
      expect(result.header.text).toBe('\u200Fכותרת');
      expect(result.body.text).toBe('\u200Fגוף ההודעה');
      expect(result.footer.text).toBe('\u200Fכותרת תחתונה');
      expect(result.action.buttons).toHaveLength(2);
      expect(result.action.buttons[0].reply.title).toBe('כן');
    });

    it('should limit buttons to 3', () => {
      const buttons = Array.from({ length: 5 }, (_, i) => ({
        id: `btn_${i}`,
        title: `כפתור ${i}`,
      }));

      const result = service.createInteractiveMessage({
        body: 'בדיקה',
        buttons,
      });

      expect(result.action.buttons).toHaveLength(3);
    });

    it('should handle message without footer', () => {
      const result = service.createInteractiveMessage({
        body: 'גוף ההודעה',
        buttons: [{ id: 'ok', title: 'אישור' }],
      });

      expect(result).not.toHaveProperty('footer');
      expect(result.body.text).toBe('\u200Fגוף ההודעה');
    });
  });

  describe('createListMessage', () => {
    it('should create list message with sections', () => {
      const result = service.createListMessage({
        header: 'בחר אופנוע',
        body: 'רשימת האופנועים הזמינים',
        footer: 'בחר מהרשימה',
        button: 'הצג רשימה',
        sections: [
          {
            title: 'אופנועים פעילים',
            rows: [
              { id: 'moto_1', title: 'הונדה CBR', description: '125cc' },
              { id: 'moto_2', title: 'ימאהה MT', description: '250cc' },
            ],
          },
        ],
      });

      expect(result.type).toBe('list');
      expect(result.header.text).toBe('\u200Fבחר אופנוע');
      expect(result.body.text).toBe('\u200Fרשימת האופנועים הזמינים');
      expect(result.footer.text).toBe('\u200Fבחר מהרשימה');
      expect(result.action.button).toBe('הצג רשימה');
      expect(result.action.sections).toHaveLength(1);
      expect(result.action.sections[0].rows).toHaveLength(2);
    });
  });

  describe('validateMessage', () => {
    it('should validate correct message', () => {
      const result = service.validateMessage('הודעה תקינה');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject message exceeding length limit', () => {
      const longMessage = 'א'.repeat(5000);
      const result = service.validateMessage(longMessage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message exceeds 4096 character limit');
    });

    it('should detect unsupported characters', () => {
      const result = service.validateMessage('הודעה עם \u0000 תו לא חוקי');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message contains unsupported control characters');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status with features', () => {
      const result = service.getHealthStatus();
      expect(result.status).toBe('healthy');
      expect(result.features).toContain('Hebrew text formatting');
      expect(result.features).toContain('RTL support');
      expect(result.features).toContain('Interactive message creation');
    });
  });
});
