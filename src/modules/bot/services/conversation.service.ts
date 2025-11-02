/**
 * Conversation Service - Persistence Layer for Bot Conversations
 *
 * Handles conversation CRUD operations, context management, and cleanup.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IConversationService } from '../interfaces/bot.interface';
import { ConversationState } from '../enums/conversation-state.enum';
import { ConversationInfo, ConversationContext } from '../../../types/domain.types';
// Using native Date methods instead of date-fns for simplicity

@Injectable()
export class ConversationService implements IConversationService {
  private readonly logger = new Logger(ConversationService.name);

  // Default conversation timeout (30 minutes)
  private readonly CONVERSATION_TIMEOUT_MINUTES = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create conversation for user
   */
  async getOrCreateConversation(userId: string): Promise<ConversationInfo> {
    try {
      // Try to find existing active conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          OR: [
            { expiresAt: null }, // No expiration set
            { expiresAt: { gt: new Date() } } // Not yet expired
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (!conversation) {
        // Create new conversation
        this.logger.debug(`Creating new conversation for user ${userId}`);

        conversation = await this.prisma.conversation.create({
          data: {
            userId,
            state: ConversationState.IDLE,
            context: {},
            expiresAt: new Date(Date.now() + this.CONVERSATION_TIMEOUT_MINUTES * 60 * 1000)
          }
        });
      } else {
        // Update expiration time for active conversation
        conversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            expiresAt: new Date(Date.now() + this.CONVERSATION_TIMEOUT_MINUTES * 60 * 1000)
          }
        });
      }

      return this.mapPrismaToConversationInfo(conversation);
    } catch (error) {
      this.logger.error(`Failed to get/create conversation for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update conversation state
   */
  async updateConversationState(
    userId: string,
    state: ConversationState,
    context?: Partial<ConversationContext>
  ): Promise<ConversationInfo> {
    try {
      // Find the active conversation
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (!conversation) {
        throw new NotFoundException(`No active conversation found for user ${userId}`);
      }

      // Update conversation
      const currentContext = (conversation.context as Record<string, any>) || {};
      const updatedContext = context ? { ...currentContext, ...context } : currentContext;

      const updatedConversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          state,
          context: updatedContext,
          expiresAt: new Date(Date.now() + this.CONVERSATION_TIMEOUT_MINUTES * 60 * 1000)
        }
      });

      this.logger.debug(`Updated conversation ${conversation.id} state to ${state}`);

      return this.mapPrismaToConversationInfo(updatedConversation);
    } catch (error) {
      this.logger.error(`Failed to update conversation state for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update conversation context
   */
  async updateConversationContext(
    userId: string,
    context: Partial<ConversationContext>
  ): Promise<ConversationInfo> {
    try {
      // Find the active conversation
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (!conversation) {
        throw new NotFoundException(`No active conversation found for user ${userId}`);
      }

      // Merge contexts
      const currentContext = (conversation.context as Record<string, any>) || {};
      const updatedContext = { ...currentContext, ...context };

      const updatedConversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          context: updatedContext,
          expiresAt: new Date(Date.now() + this.CONVERSATION_TIMEOUT_MINUTES * 60 * 1000)
        }
      });

      this.logger.debug(`Updated conversation ${conversation.id} context`);

      return this.mapPrismaToConversationInfo(updatedConversation);
    } catch (error) {
      this.logger.error(`Failed to update conversation context for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(userId: string): Promise<void> {
    try {
      // Find and delete all conversations for user (including expired ones)
      const result = await this.prisma.conversation.deleteMany({
        where: { userId }
      });

      this.logger.debug(`Deleted ${result.count} conversations for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete conversations for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Check if conversation is expired
   */
  isConversationExpired(conversation: ConversationInfo): boolean {
    if (!conversation.expiresAt) {
      return false; // No expiration set
    }

    return new Date() > conversation.expiresAt;
  }

  /**
   * Clean up expired conversations
   */
  async cleanupExpiredConversations(): Promise<number> {
    try {
      const result = await this.prisma.conversation.deleteMany({
        where: {
          expiresAt: {
            lt: new Date() // Expired
          }
        }
      });

      this.logger.log(`Cleaned up ${result.count} expired conversations`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired conversations', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID (for internal use)
   */
  async getConversationById(id: string): Promise<ConversationInfo | null> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id }
      });

      return conversation ? this.mapPrismaToConversationInfo(conversation) : null;
    } catch (error) {
      this.logger.error(`Failed to get conversation ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all active conversations (for monitoring)
   */
  async getActiveConversations(): Promise<ConversationInfo[]> {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              role: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return conversations.map(this.mapPrismaToConversationInfo);
    } catch (error) {
      this.logger.error('Failed to get active conversations', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics (for monitoring)
   */
  async getConversationStats(): Promise<{
    totalActive: number;
    byState: Record<string, number>;
    expiredCount: number;
  }> {
    try {
      const now = new Date();

      // Active conversations
      const activeConversations = await this.prisma.conversation.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      });

      // Expired conversations
      const expiredConversations = await this.prisma.conversation.findMany({
        where: {
          expiresAt: { lt: now }
        }
      });

      // Group by state
      const byState: Record<string, number> = {};
      activeConversations.forEach((conv: any) => {
        byState[conv.state] = (byState[conv.state] || 0) + 1;
      });

      return {
        totalActive: activeConversations.length,
        byState,
        expiredCount: expiredConversations.length
      };
    } catch (error) {
      this.logger.error('Failed to get conversation stats', error);
      throw error;
    }
  }

  /**
   * Extend conversation expiration
   */
  async extendConversationExpiration(
    userId: string,
    additionalMinutes: number = this.CONVERSATION_TIMEOUT_MINUTES
  ): Promise<ConversationInfo> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (!conversation) {
        throw new NotFoundException(`No active conversation found for user ${userId}`);
      }

      const newExpiration = new Date(Date.now() + additionalMinutes * 60 * 1000);

      const updatedConversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { expiresAt: newExpiration }
      });

      this.logger.debug(`Extended conversation ${conversation.id} expiration by ${additionalMinutes} minutes`);

      return this.mapPrismaToConversationInfo(updatedConversation);
    } catch (error) {
      this.logger.error(`Failed to extend conversation expiration for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Map Prisma conversation to ConversationInfo
   */
  private mapPrismaToConversationInfo(conversation: any): ConversationInfo {
    return {
      id: conversation.id,
      userId: conversation.userId,
      state: conversation.state,
      context: conversation.context || {},
      expiresAt: conversation.expiresAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  }
}
