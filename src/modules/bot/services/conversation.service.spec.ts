/**
 * Conversation Service - Unit Tests
 *
 * Comprehensive tests for conversation persistence operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../../database/prisma.service';
import { ConversationState } from '../enums/conversation-state.enum';
import { ConversationInfo } from '../../../types/domain.types';
// Using native Date methods

describe('ConversationService', () => {
  let service: ConversationService;
  let prismaService: any;

  const mockPrismaConversation = {
    id: 'conv-123',
    userId: 'user-123',
    state: ConversationState.IDLE,
    context: { testKey: 'testValue' },
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockConversationInfo: ConversationInfo = {
    id: 'conv-123',
    userId: 'user-123',
    state: ConversationState.IDLE,
    context: { testKey: 'testValue' },
    expiresAt: mockPrismaConversation.expiresAt || new Date(Date.now() + 30 * 60 * 1000),
    createdAt: mockPrismaConversation.createdAt,
    updatedAt: mockPrismaConversation.updatedAt
  };

  beforeEach(async () => {
    const mockPrismaService = {
      conversation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
      }
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateConversation', () => {
    it('should return existing active conversation', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(mockPrismaConversation);
      prismaService.conversation.update.mockResolvedValue(mockPrismaConversation);

      const result = await service.getOrCreateConversation('user-123');

      expect(result).toEqual(mockConversationInfo);
      expect(prismaService.conversation.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
      expect(prismaService.conversation.update).toHaveBeenCalled();
    });

    it('should create new conversation when none exists', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(null);
      prismaService.conversation.create.mockResolvedValue(mockPrismaConversation);

      const result = await service.getOrCreateConversation('user-123');

      expect(result).toEqual(mockConversationInfo);
      expect(prismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          state: ConversationState.IDLE,
          context: {},
          expiresAt: expect.any(Date)
        }
      });
    });

    it('should handle database errors', async () => {
      prismaService.conversation.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(service.getOrCreateConversation('user-123')).rejects.toThrow('Database error');
    });
  });

  describe('updateConversationState', () => {
    it('should update conversation state and context', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(mockPrismaConversation);
      prismaService.conversation.update.mockResolvedValue({
        ...mockPrismaConversation,
        state: ConversationState.AWAITING_MENU_SELECTION,
        context: { ...mockPrismaConversation.context, newKey: 'newValue' }
      });

      const result = await service.updateConversationState(
        'user-123',
        ConversationState.AWAITING_MENU_SELECTION,
        { newKey: 'newValue' }
      );

      expect(result.state).toBe(ConversationState.AWAITING_MENU_SELECTION);
      expect(result.context).toEqual({ testKey: 'testValue', newKey: 'newValue' });
      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
        data: {
          state: ConversationState.AWAITING_MENU_SELECTION,
          context: { testKey: 'testValue', newKey: 'newValue' },
          expiresAt: expect.any(Date)
        }
      });
    });

    it('should update conversation state without context', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(mockPrismaConversation);
      prismaService.conversation.update.mockResolvedValue({
        ...mockPrismaConversation,
        state: ConversationState.AWAITING_CONFIRMATION
      });

      const result = await service.updateConversationState(
        'user-123',
        ConversationState.AWAITING_CONFIRMATION
      );

      expect(result.state).toBe(ConversationState.AWAITING_CONFIRMATION);
      expect(result.context).toEqual(mockPrismaConversation.context);
    });

    it('should throw NotFoundException when no active conversation exists', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.updateConversationState('user-123', ConversationState.IDLE)
      ).rejects.toThrow('No active conversation found for user user-123');
    });
  });

  describe('updateConversationContext', () => {
    it('should merge new context with existing context', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(mockPrismaConversation);
      prismaService.conversation.update.mockResolvedValue({
        ...mockPrismaConversation,
        context: { testKey: 'testValue', updatedKey: 'updatedValue' }
      });

      const result = await service.updateConversationContext('user-123', {
        updatedKey: 'updatedValue'
      });

      expect(result.context).toEqual({
        testKey: 'testValue',
        updatedKey: 'updatedValue'
      });
    });

    it('should throw NotFoundException when no active conversation exists', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.updateConversationContext('user-123', { key: 'value' })
      ).rejects.toThrow('No active conversation found for user user-123');
    });
  });

  describe('deleteConversation', () => {
    it('should delete all conversations for user', async () => {
      prismaService.conversation.deleteMany.mockResolvedValue({ count: 3 });

      await service.deleteConversation('user-123');

      expect(prismaService.conversation.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' }
      });
    });

    it('should handle database errors during deletion', async () => {
      prismaService.conversation.deleteMany.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteConversation('user-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('isConversationExpired', () => {
    it('should return false for conversation with no expiration', () => {
      const conversation: ConversationInfo = {
        ...mockConversationInfo,
        expiresAt: undefined as any
      };

      const result = service.isConversationExpired(conversation);
      expect(result).toBe(false);
    });

    it('should return false for non-expired conversation', () => {
      const futureTime = new Date();
      futureTime.setMinutes(futureTime.getMinutes() + 10); // 10 minutes in the future

      const conversation: ConversationInfo = {
        ...mockConversationInfo,
        expiresAt: futureTime
      };

      const result = service.isConversationExpired(conversation);
      expect(result).toBe(false);
    });

    it('should return true for expired conversation', () => {
      const conversation: ConversationInfo = {
        ...mockConversationInfo,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000) // Expired 10 minutes ago
      };

      const result = service.isConversationExpired(conversation);
      expect(result).toBe(true);
    });
  });

  describe('cleanupExpiredConversations', () => {
    it('should delete expired conversations and return count', async () => {
      prismaService.conversation.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredConversations();

      expect(result).toBe(5);
      expect(prismaService.conversation.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
    });

    it('should handle database errors during cleanup', async () => {
      prismaService.conversation.deleteMany.mockRejectedValue(new Error('Cleanup failed'));

      await expect(service.cleanupExpiredConversations()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('getConversationById', () => {
    it('should return conversation when found', async () => {
      prismaService.conversation.findUnique.mockResolvedValue(mockPrismaConversation);

      const result = await service.getConversationById('conv-123');

      expect(result).toEqual(mockConversationInfo);
    });

    it('should return null when conversation not found', async () => {
      prismaService.conversation.findUnique.mockResolvedValue(null);

      const result = await service.getConversationById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getActiveConversations', () => {
    it('should return all active conversations with user info', async () => {
      const conversationsWithUsers = [
        {
          ...mockPrismaConversation,
          user: {
            id: 'user-123',
            phoneNumber: '+972501234567',
            role: 'COURIER'
          }
        }
      ];

      prismaService.conversation.findMany.mockResolvedValue(conversationsWithUsers);

      const result = await service.getActiveConversations();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockConversationInfo);
      expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
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
    });
  });

  describe('getConversationStats', () => {
    it('should return comprehensive conversation statistics', async () => {
      const activeConversations = [
        { ...mockPrismaConversation, state: ConversationState.IDLE },
        { ...mockPrismaConversation, state: ConversationState.AWAITING_MENU_SELECTION, id: 'conv-456' },
        { ...mockPrismaConversation, state: ConversationState.AWAITING_MENU_SELECTION, id: 'conv-789' }
      ];

      const expiredConversations = [
        { ...mockPrismaConversation, id: 'expired-1' },
        { ...mockPrismaConversation, id: 'expired-2' }
      ];

      prismaService.conversation.findMany
        .mockResolvedValueOnce(activeConversations) // First call for active
        .mockResolvedValueOnce(expiredConversations); // Second call for expired

      const result = await service.getConversationStats();

      expect(result.totalActive).toBe(3);
      expect(result.byState[ConversationState.IDLE]).toBe(1);
      expect(result.byState[ConversationState.AWAITING_MENU_SELECTION]).toBe(2);
      expect(result.expiredCount).toBe(2);
    });
  });

  describe('extendConversationExpiration', () => {
    it('should extend conversation expiration by default time', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(mockPrismaConversation);
      prismaService.conversation.update.mockResolvedValue({
        ...mockPrismaConversation,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      const result = await service.extendConversationExpiration('user-123');

      expect(result.expiresAt).toBeDefined();
      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
        data: { expiresAt: expect.any(Date) }
      });
    });

    it('should extend conversation expiration by custom time', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(mockPrismaConversation);
      prismaService.conversation.update.mockResolvedValue({
        ...mockPrismaConversation,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      const result = await service.extendConversationExpiration('user-123', 60);

      expect(result.expiresAt).toBeDefined();
    });

    it('should throw NotFoundException when no active conversation exists', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.extendConversationExpiration('user-123')
      ).rejects.toThrow('No active conversation found for user user-123');
    });
  });
});
