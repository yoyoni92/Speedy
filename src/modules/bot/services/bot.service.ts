/**
 * Bot Service - Conversation Orchestrator
 *
 * Main orchestrator for WhatsApp bot conversations, coordinating between
 * message processing, state management, and response generation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { StateMachineService } from './state-machine.service';
import { WhatsAppService, WhatsAppMessage } from '../../whatsapp/services/whatsapp.service';
import { AuthenticatedUser } from '../../../types/domain.types';

export interface BotProcessResult {
  success: boolean;
  messageId?: string;
  conversationEnded: boolean;
  error?: string;
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly stateMachine: StateMachineService,
    private readonly whatsApp: WhatsAppService,
  ) {}

  /**
   * Process incoming WhatsApp message
   */
  async processMessage(
    whatsAppMessage: WhatsAppMessage,
    authenticatedUser?: AuthenticatedUser,
  ): Promise<BotProcessResult> {
    try {
      // Create authenticated user from phone number if not provided
      const user = authenticatedUser || this.createUserFromPhone(whatsAppMessage.from);

      // Convert webhook message to domain format
      const domainMessage = this.convertToDomainMessage(whatsAppMessage);

      // Process message through state machine
      const result = await this.stateMachine.processTransition({
        user,
        message: domainMessage,
      });

      // Send response via WhatsApp
      const messageId = await this.whatsApp.sendTextMessage(
        whatsAppMessage.from,
        result.response,
      );

      this.logger.log(
        `Bot response sent to ${whatsAppMessage.from}: conversation=${result.conversation.state}, ended=${result.shouldEndConversation}`,
      );

      return {
        success: true,
        messageId,
        conversationEnded: result.shouldEndConversation,
      };
    } catch (error) {
      this.logger.error(`Bot processing error for ${whatsAppMessage.from}:`, error);

      // Send error message to user
      try {
        await this.whatsApp.sendTextMessage(
          whatsAppMessage.from,
          'אירעה שגיאה בעיבוד ההודעה. אנא נסה שוב.',
        );
      } catch (sendError) {
        this.logger.error('Failed to send error message:', sendError);
      }

      return {
        success: false,
        conversationEnded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send proactive message to user
   */
  async sendProactiveMessage(
    phoneNumber: string,
    message: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<BotProcessResult> {
    try {
      const messageId = await this.whatsApp.sendTextMessage(phoneNumber, message);

      this.logger.log(`Proactive message sent to ${phoneNumber}`);

      return {
        success: true,
        messageId,
        conversationEnded: false,
      };
    } catch (error) {
      this.logger.error(`Failed to send proactive message to ${phoneNumber}:`, error);

      return {
        success: false,
        conversationEnded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send maintenance reminder
   */
  async sendMaintenanceReminder(
    phoneNumber: string,
    motorcycleId: string,
    nextServiceKm: number,
    currentMileage: number,
  ): Promise<BotProcessResult> {
    try {
      const kmUntilService = nextServiceKm - currentMileage;
      const message = `🚨 תזכורת תחזוקה\n\n` +
        `האופנוע שלך צריך טיפול תחזוקה בעוד ${kmUntilService.toLocaleString('he-IL')} ק"מ.\n` +
        `קילומטראז נוכחי: ${currentMileage.toLocaleString('he-IL')}\n\n` +
        `האם תרצה לתאם טיפול?`;

      const messageId = await this.whatsApp.sendTextMessage(phoneNumber, message);

      this.logger.log(`Maintenance reminder sent to ${phoneNumber} for motorcycle ${motorcycleId}`);

      return {
        success: true,
        messageId,
        conversationEnded: false,
      };
    } catch (error) {
      this.logger.error(`Failed to send maintenance reminder to ${phoneNumber}:`, error);

      return {
        success: false,
        conversationEnded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send mileage report request
   */
  async requestMileageReport(phoneNumber: string, motorcycleId: string): Promise<BotProcessResult> {
    try {
      const message = `📊 דיווח קילומטראז נדרש\n\n` +
        `אנא עדכן את הקילומטראז הנוכחי של האופנוע:\n\n` +
        `שלח מספר הקילומטראז (לדוגמה: 15000)`;

      const messageId = await this.whatsApp.sendTextMessage(phoneNumber, message);

      this.logger.log(`Mileage report request sent to ${phoneNumber} for motorcycle ${motorcycleId}`);

      return {
        success: true,
        messageId,
        conversationEnded: false,
      };
    } catch (error) {
      this.logger.error(`Failed to send mileage request to ${phoneNumber}:`, error);

      return {
        success: false,
        conversationEnded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert webhook WhatsApp message to domain format
   */
  private convertToDomainMessage(whatsAppMessage: WhatsAppMessage): import('../../../types/domain.types').WhatsAppMessage {
    return {
      from: whatsAppMessage.from,
      to: '', // Not available in webhook, could be filled from config
      body: this.extractMessageBody(whatsAppMessage),
      messageId: whatsAppMessage.id,
      timestamp: new Date(parseInt(whatsAppMessage.timestamp) * 1000),
      type: whatsAppMessage.type === 'text' ? 'text' : 'text', // Simplify for MVP
    };
  }

  /**
   * Extract message body from WhatsApp message
   */
  private extractMessageBody(whatsAppMessage: WhatsAppMessage): string {
    // Handle different message types
    if (whatsAppMessage.text) {
      return whatsAppMessage.text.body;
    }

    if (whatsAppMessage.interactive) {
      if (whatsAppMessage.interactive.button_reply) {
        return whatsAppMessage.interactive.button_reply.id;
      }

      if (whatsAppMessage.interactive.list_reply) {
        return whatsAppMessage.interactive.list_reply.id;
      }
    }

    // For unsupported message types, return empty string
    this.logger.warn(`Unsupported message type: ${whatsAppMessage.type}`);
    return '';
  }

  /**
   * Create authenticated user from phone number
   */
  private createUserFromPhone(phoneNumber: string): AuthenticatedUser {
    // In production, this would look up the user from database
    // For MVP, create a minimal user object
    return {
      id: phoneNumber, // Use phone as temporary ID
      phoneNumber,
      role: 'COURIER', // Default role
      isActive: true,
      // Other fields would be populated from database
    };
  }

  /**
   * Get bot service health status
   */
  getHealthStatus(): {
    status: string;
    whatsAppConfigured: boolean;
    stateMachineHealthy: boolean;
  } {
    const whatsAppStatus = this.whatsApp.getHealthStatus();

    return {
      status: whatsAppStatus.configured ? 'healthy' : 'development',
      whatsAppConfigured: whatsAppStatus.configured,
      stateMachineHealthy: true, // State machine doesn't have external dependencies
    };
  }
}
