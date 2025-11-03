/**
 * Message Formatter Service - Hebrew Text Processing
 *
 * Handles Hebrew text formatting, RTL support, and WhatsApp message preparation
 * with proper encoding and character handling.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface MessageFormatOptions {
  rtl?: boolean;
  maxLength?: number;
  preserveNewlines?: boolean;
}

@Injectable()
export class MessageFormatterService {
  private readonly logger = new Logger(MessageFormatterService.name);

  /**
   * Format text for WhatsApp with Hebrew support
   */
  formatForWhatsApp(text: string, options: MessageFormatOptions = {}): string {
    let formatted = text;

    // Apply RTL formatting if explicitly requested or if text contains Hebrew and RTL is not explicitly disabled
    if (options.rtl !== false && /[\u0590-\u05FF]/.test(text)) {
      formatted = this.addRtlMarkers(formatted);
    }

    // Handle Hebrew characters and encoding
    formatted = this.normalizeHebrewText(formatted);

    // Truncate if max length specified
    if (options.maxLength && formatted.length > options.maxLength) {
      formatted = this.truncateText(formatted, options.maxLength);
    }

    // Preserve newlines or convert to WhatsApp format
    if (!options.preserveNewlines) {
      formatted = this.formatNewlines(formatted);
    }

    return formatted;
  }

  /**
   * Add RTL (Right-to-Left) markers for proper Hebrew display
   */
  private addRtlMarkers(text: string): string {
    // Check if text contains Hebrew characters
    const hasHebrew = /[\u0590-\u05FF]/.test(text);

    if (hasHebrew) {
      // Add RTL mark at the beginning for WhatsApp
      return '\u200F' + text;
    }

    return text;
  }

  /**
   * Normalize Hebrew text for consistent display
   */
  private normalizeHebrewText(text: string): string {
    // Normalize Hebrew presentation forms
    let normalized = text
      .normalize('NFKC') // Compatibility decomposition followed by canonical composition
      .replace(/״/g, '"') // Convert Hebrew quotation marks
      .replace(/׳/g, "'") // Convert Hebrew apostrophe
      .replace(/–/g, '-') // Convert en dash
      .replace(/—/g, '-') // Convert em dash
      .replace(/…/g, '...'); // Convert ellipsis

    // Handle Hebrew-specific character combinations
    normalized = this.fixHebrewLigatures(normalized);

    return normalized;
  }

  /**
   * Fix Hebrew ligatures and special combinations
   */
  private fixHebrewLigatures(text: string): string {
    // Handle common Hebrew character combinations that might not display correctly
    return text
      .replace(/כּ/g, 'כ') // Remove dagesh from kaf
      .replace(/בּ/g, 'ב') // Remove dagesh from bet
      .replace(/פּ/g, 'פ'); // Remove dagesh from pe
  }

  /**
   * Truncate text while preserving word boundaries
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Find the last space within the limit
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > maxLength * 0.8) {
      // If there's a space reasonably close to the end, truncate there
      return truncated.substring(0, lastSpaceIndex) + '...';
    }

    // Otherwise, hard truncate and add ellipsis
    return truncated.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format newlines for WhatsApp compatibility
   */
  private formatNewlines(text: string): string {
    // WhatsApp supports \n for line breaks
    // Ensure consistent line ending handling
    return text
      .replace(/\r\n/g, '\n') // Convert Windows line endings
      .replace(/\r/g, '\n') // Convert old Mac line endings
      .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines to 2
  }

  /**
   * Format numbers in Hebrew context
   */
  formatNumbersInHebrew(numbers: string | number): string {
    if (typeof numbers === 'number') {
      numbers = numbers.toString();
    }

    // Convert Western Arabic numerals to Eastern Arabic numerals for Hebrew context
    // Note: WhatsApp handles both numeral systems well, but Eastern Arabic is more common in Hebrew
    return numbers
      .replace(/0/g, '٠')
      .replace(/1/g, '١')
      .replace(/2/g, '٢')
      .replace(/3/g, '٣')
      .replace(/4/g, '٤')
      .replace(/5/g, '٥')
      .replace(/6/g, '٦')
      .replace(/7/g, '٧')
      .replace(/8/g, '٨')
      .replace(/9/g, '٩');
  }

  /**
   * Format currency amounts for Hebrew display
   */
  formatCurrency(amount: number, currency: string = '₪'): string {
    const formattedNumber = this.formatNumbersInHebrew(amount.toLocaleString('he-IL'));
    return `${formattedNumber} ${currency}`;
  }

  /**
   * Format dates in Hebrew locale
   */
  formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    };

    return date.toLocaleDateString('he-IL', defaultOptions);
  }

  /**
   * Create interactive message components for WhatsApp
   */
  createInteractiveMessage(options: {
    header?: string;
    body: string;
    footer?: string;
    buttons?: Array<{ id: string; title: string }>;
  }): any {
    const interactive: any = {
      type: 'button',
      body: {
        text: this.formatForWhatsApp(options.body, { rtl: true }),
      },
    };

    if (options.header) {
      interactive.header = {
        type: 'text',
        text: this.formatForWhatsApp(options.header, { rtl: true }),
      };
    }

    if (options.footer) {
      interactive.footer = {
        text: this.formatForWhatsApp(options.footer, { rtl: true }),
      };
    }

    if (options.buttons && options.buttons.length > 0) {
      interactive.action = {
        buttons: options.buttons.slice(0, 3).map(button => ({
          type: 'reply',
          reply: {
            id: button.id,
            title: button.title,
          },
        })),
      };
    }

    return interactive;
  }

  /**
   * Create list message for WhatsApp
   */
  createListMessage(options: {
    header: string;
    body: string;
    footer?: string;
    button: string;
    sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  }): any {
    return {
      type: 'list',
      header: {
        type: 'text',
        text: this.formatForWhatsApp(options.header, { rtl: true }),
      },
      body: {
        text: this.formatForWhatsApp(options.body, { rtl: true }),
      },
      footer: options.footer ? {
        text: this.formatForWhatsApp(options.footer, { rtl: true }),
      } : undefined,
      action: {
        button: options.button,
        sections: options.sections.map(section => ({
          title: section.title,
          rows: section.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
          })),
        })),
      },
    };
  }

  /**
   * Validate message content for WhatsApp
   */
  validateMessage(text: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check length (WhatsApp limit is 4096 characters)
    if (text.length > 4096) {
      errors.push('Message exceeds 4096 character limit');
    }

    // Check for unsupported characters
    const unsupportedChars = text.match(/[\u0000-\u001F\u007F-\u009F]/g);
    if (unsupportedChars) {
      errors.push('Message contains unsupported control characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus(): { status: string; features: string[] } {
    return {
      status: 'healthy',
      features: [
        'Hebrew text formatting',
        'RTL support',
        'Interactive message creation',
        'Message validation',
        'Number formatting',
      ],
    };
  }
}
