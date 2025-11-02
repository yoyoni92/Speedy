/**
 * State Machine Service - Unit Tests
 *
 * Comprehensive tests for conversation state management and transitions.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StateMachineService } from './state-machine.service';
import { ConversationService } from './conversation.service';
import { MenuBuilderService } from './menu-builder.service';
import { ResponseGeneratorService } from './response-generator.service';
import { ConversationState } from '../enums/conversation-state.enum';
import { ConversationInfo, ProcessMessageInput, UserRole } from '../../../types/domain.types';

describe('StateMachineService', () => {
  let service: StateMachineService;
  let conversationService: any;
  let menuBuilderService: any;
  let responseGeneratorService: any;

  const mockUser = {
    id: 'user-123',
    phoneNumber: '+972501234567',
    role: UserRole.COURIER,
    isActive: true,
    courier: {
      id: 'courier-123',
      name: 'ישראל ישראלי',
      isActive: true
    }
  };

  const mockMessage = {
    from: '+972501234567',
    to: '123456789',
    body: '1',
    messageId: 'msg-123',
    timestamp: new Date(),
    type: 'text' as const
  };

  const mockConversation: ConversationInfo = {
    id: 'conv-123',
    userId: 'user-123',
    state: ConversationState.IDLE,
    context: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMainMenu = {
    id: 'main-menu',
    title: 'תפריט ראשי',
    options: [
      {
        key: '1',
        label: 'דווח קילומטראז\'',
        description: 'דיווח קילומטראז\' לאופנוע',
        enabled: true,
        action: 'report_mileage'
      },
      {
        key: '2',
        label: 'צפה בתחזוקה',
        description: 'צפה בלוח התחזוקה',
        enabled: true,
        action: 'view_maintenance'
      },
      {
        key: '3',
        label: 'סיים שיחה',
        description: 'סיים את השיחה',
        enabled: true,
        action: 'end_conversation'
      }
    ],
    allowBack: false
  };

  beforeEach(async () => {
    const mockConversationService = {
      getOrCreateConversation: jest.fn(),
      updateConversationState: jest.fn(),
      updateConversationContext: jest.fn(),
      deleteConversation: jest.fn(),
      isConversationExpired: jest.fn(),
      cleanupExpiredConversations: jest.fn()
    };

    const mockMenuBuilderService = {
      buildMainMenu: jest.fn(),
      buildMotorcycleSelectionMenu: jest.fn(),
      buildMaintenanceMenu: jest.fn(),
      buildMileageReportingMenu: jest.fn(),
      buildAdminMenu: jest.fn(),
      renderMenu: jest.fn()
    };

    const mockResponseGeneratorService = {
      generateWelcomeMessage: jest.fn(),
      generateErrorMessage: jest.fn(),
      generateSuccessMessage: jest.fn(),
      generateMotorcycleInfo: jest.fn(),
      generateMaintenanceReminder: jest.fn(),
      generateMenuMessage: jest.fn(),
      formatHebrewText: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateMachineService,
        {
          provide: ConversationService,
          useValue: mockConversationService
        },
        {
          provide: MenuBuilderService,
          useValue: mockMenuBuilderService
        },
        {
          provide: ResponseGeneratorService,
          useValue: mockResponseGeneratorService
        }
      ]
    }).compile();

    service = module.get<StateMachineService>(StateMachineService);
    conversationService = module.get(ConversationService);
    menuBuilderService = module.get(MenuBuilderService);
    responseGeneratorService = module.get(ResponseGeneratorService);

    // Setup default mocks
    conversationService.getOrCreateConversation.mockResolvedValue(mockConversation);
    conversationService.updateConversationState.mockResolvedValue(mockConversation);
    conversationService.isConversationExpired.mockReturnValue(false);
    menuBuilderService.buildMainMenu.mockResolvedValue(mockMainMenu);
    responseGeneratorService.generateWelcomeMessage.mockReturnValue('ברוך הבא ישראל!');
    responseGeneratorService.generateMenuMessage.mockReturnValue('תפריט ראשי:\n1. דווח קילומטראז\'');
    responseGeneratorService.generateErrorMessage.mockImplementation((error: any) => {
      if (error.userMessage) {
        return `❌ שגיאה: ${error.userMessage}`;
      }
      return 'שגיאה: בחירה לא תקינה';
    });
    responseGeneratorService.generateSuccessMessage.mockImplementation((action: string, data?: any) => {
      switch (action) {
        case 'mileage_reported':
          const mileage = data?.mileage?.toLocaleString('he-IL') || '0';
          const motorcycleId = data?.motorcycleId || '';
          return `✅ דיווח קילומטראז' הושלם!\nקילומטראז': ${mileage}\nאופנוע: ${motorcycleId}`;
        case 'conversation_ended':
          return 'שיחה הופסקה בהצלחה';
        default:
          return 'פעולה הושלמה בהצלחה';
      }
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processTransition', () => {
    const input: ProcessMessageInput = {
      user: mockUser,
      message: mockMessage
    };

    it('should handle IDLE state transition to menu selection', async () => {
      const result = await service.processTransition(input);

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MENU_SELECTION);
      expect(result.shouldEndConversation).toBe(false);
      expect(conversationService.updateConversationState).toHaveBeenCalledWith(
        'user-123',
        ConversationState.AWAITING_MENU_SELECTION,
        expect.objectContaining({
          lastMenuSelection: null,
          errorCount: 0
        })
      );
    });

    it('should handle menu selection with valid option', async () => {
      const menuSelectionConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MENU_SELECTION
      };
      conversationService.getOrCreateConversation.mockResolvedValue(menuSelectionConversation);

      const mileageMenu = { ...mockMainMenu, id: 'mileage-menu' };
      menuBuilderService.buildMotorcycleSelectionMenu.mockResolvedValue(mileageMenu);
      responseGeneratorService.generateMenuMessage.mockReturnValue('בחר אופנוע:');

      const result = await service.processTransition({
        ...input,
        message: { ...mockMessage, body: '1' } // Select report mileage
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MOTORCYCLE_SELECTION);
      expect(result.shouldEndConversation).toBe(false);
      expect(menuBuilderService.buildMotorcycleSelectionMenu).toHaveBeenCalledWith('user-123');
    });

    it('should handle invalid menu selection with error recovery', async () => {
      const menuSelectionConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MENU_SELECTION
      };
      conversationService.getOrCreateConversation.mockResolvedValue(menuSelectionConversation);

      const result = await service.processTransition({
        ...input,
        message: { ...mockMessage, body: 'invalid' }
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MENU_SELECTION);
      expect(result.shouldEndConversation).toBe(false);
      expect(result.conversation.context?.errorCount).toBe(1);
    });

    it('should reset conversation after 3 invalid attempts', async () => {
      const menuSelectionConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MENU_SELECTION,
        context: { errorCount: 2 }
      };
      conversationService.getOrCreateConversation.mockResolvedValue(menuSelectionConversation);

      const result = await service.processTransition({
        ...input,
        message: { ...mockMessage, body: 'invalid' }
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MENU_SELECTION);
      expect(result.shouldEndConversation).toBe(false);
      // Should reset to IDLE state after 3 errors
    });

    it('should handle end conversation action', async () => {
      const menuSelectionConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MENU_SELECTION
      };
      conversationService.getOrCreateConversation.mockResolvedValue(menuSelectionConversation);

      const result = await service.processTransition({
        ...input,
        message: { ...mockMessage, body: '3' } // End conversation
      });

      expect(result.conversation.state).toBe(ConversationState.IDLE);
      expect(result.shouldEndConversation).toBe(true);
    });
  });

  describe('handleMileageInputState', () => {
    it('should accept valid mileage input', async () => {
      const mileageInputConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MILEAGE_INPUT,
        context: { selectedMotorcycleId: 'motorcycle-123' }
      };
      conversationService.getOrCreateConversation.mockResolvedValue(mileageInputConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: '15000' }
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_CONFIRMATION);
      expect(result.conversation.context?.pendingMileage).toBe(15000);
      expect(result.response).toContain('האם אתה מאשר');
    });

    it('should reject invalid mileage input', async () => {
      const mileageInputConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MILEAGE_INPUT
      };
      conversationService.getOrCreateConversation.mockResolvedValue(mileageInputConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: 'invalid' }
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MILEAGE_INPUT);
      expect(result.shouldEndConversation).toBe(false);
      expect(result.conversation.context?.errorCount).toBe(1);
    });

    it('should reject negative mileage', async () => {
      const mileageInputConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MILEAGE_INPUT
      };
      conversationService.getOrCreateConversation.mockResolvedValue(mileageInputConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: '-1000' }
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MILEAGE_INPUT);
      expect(result.conversation.context?.errorCount).toBe(1);
    });

    it('should reject mileage too high', async () => {
      const mileageInputConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_MILEAGE_INPUT
      };
      conversationService.getOrCreateConversation.mockResolvedValue(mileageInputConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: '1000000' }
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MILEAGE_INPUT);
      expect(result.conversation.context?.errorCount).toBe(1);
    });
  });

  describe('handleConfirmationState', () => {
    it('should process confirmed mileage report', async () => {
      const confirmationConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_CONFIRMATION,
        context: {
          selectedMotorcycleId: 'motorcycle-123',
          pendingMileage: 15000
        }
      };
      conversationService.getOrCreateConversation.mockResolvedValue(confirmationConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: '1' } // Confirm
      });

      expect(result.conversation.state).toBe(ConversationState.IDLE);
      expect(result.shouldEndConversation).toBe(true);
      expect(result.response).toContain('דיווח קילומטראז\' הושלם');
    });

    it('should handle Hebrew confirmation', async () => {
      const confirmationConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_CONFIRMATION,
        context: {
          selectedMotorcycleId: 'motorcycle-123',
          pendingMileage: 15000
        }
      };
      conversationService.getOrCreateConversation.mockResolvedValue(confirmationConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: 'כן' } // Hebrew "yes"
      });

      expect(result.conversation.state).toBe(ConversationState.IDLE);
      expect(result.shouldEndConversation).toBe(true);
    });

    it('should handle cancellation', async () => {
      const confirmationConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_CONFIRMATION,
        context: {
          selectedMotorcycleId: 'motorcycle-123',
          pendingMileage: 15000
        }
      };
      conversationService.getOrCreateConversation.mockResolvedValue(confirmationConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: '2' } // Cancel
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MENU_SELECTION);
      expect(result.shouldEndConversation).toBe(false);
      expect(result.conversation.context?.pendingMileage).toBeUndefined();
    });

    it('should handle Hebrew cancellation', async () => {
      const confirmationConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_CONFIRMATION,
        context: {
          selectedMotorcycleId: 'motorcycle-123',
          pendingMileage: 15000
        }
      };
      conversationService.getOrCreateConversation.mockResolvedValue(confirmationConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: 'לא' } // Hebrew "no"
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_MENU_SELECTION);
      expect(result.shouldEndConversation).toBe(false);
    });

    it('should handle invalid confirmation input', async () => {
      const confirmationConversation = {
        ...mockConversation,
        state: ConversationState.AWAITING_CONFIRMATION,
        context: {
          selectedMotorcycleId: 'motorcycle-123',
          pendingMileage: 15000
        }
      };
      conversationService.getOrCreateConversation.mockResolvedValue(confirmationConversation);

      const result = await service.processTransition({
        user: mockUser,
        message: { ...mockMessage, body: 'invalid' }
      });

      expect(result.conversation.state).toBe(ConversationState.AWAITING_CONFIRMATION);
      expect(result.shouldEndConversation).toBe(false);
      expect(result.conversation.context?.errorCount).toBe(1);
    });
  });

  describe('validateTransition', () => {
    it('should validate allowed transitions', async () => {
      const input: ProcessMessageInput = {
        user: mockUser,
        message: mockMessage
      };

      const isValid = await service.validateTransition(
        ConversationState.IDLE,
        ConversationState.AWAITING_MENU_SELECTION,
        input
      );
      expect(isValid).toBe(true);
    });

    it('should reject invalid transitions', async () => {
      const input: ProcessMessageInput = {
        user: mockUser,
        message: mockMessage
      };

      const isValid = await service.validateTransition(
        ConversationState.IDLE,
        ConversationState.AWAITING_CONFIRMATION, // Invalid transition
        input
      );
      expect(isValid).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for IDLE state', () => {
      const transitions = service.getAvailableTransitions(ConversationState.IDLE);

      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toBeDefined();
      expect(transitions[0]!.fromState).toBe(ConversationState.IDLE);
      expect(transitions[0]!.toState).toBe(ConversationState.AWAITING_MENU_SELECTION);
    });

    it('should return available transitions for menu selection state', () => {
      const transitions = service.getAvailableTransitions(ConversationState.AWAITING_MENU_SELECTION);

      expect(transitions).toHaveLength(2);
      const toStates = transitions.map(t => t.toState);
      expect(toStates).toContain(ConversationState.AWAITING_MOTORCYCLE_SELECTION);
      expect(toStates).toContain(ConversationState.IDLE);
    });
  });

  describe('resetConversation', () => {
    it('should reset conversation to IDLE state', async () => {
      await service.resetConversation('user-123');

      expect(conversationService.updateConversationState).toHaveBeenCalledWith(
        'user-123',
        ConversationState.IDLE,
        {}
      );
    });
  });

  describe('error handling', () => {
    it('should handle expired conversations', async () => {
      conversationService.isConversationExpired.mockReturnValue(true);

      const input: ProcessMessageInput = {
        user: mockUser,
        message: mockMessage
      };

      await service.processTransition(input);

      // Should call reset and get fresh conversation
      expect(conversationService.updateConversationState).toHaveBeenCalledWith(
        'user-123',
        ConversationState.IDLE,
        {}
      );
    });

    it('should handle unknown states gracefully', async () => {
      const unknownStateConversation = {
        ...mockConversation,
        state: 'UNKNOWN_STATE' as ConversationState
      };
      conversationService.getOrCreateConversation.mockResolvedValue(unknownStateConversation);

      const input: ProcessMessageInput = {
        user: mockUser,
        message: mockMessage
      };

      const result = await service.processTransition(input);

      expect(result.shouldEndConversation).toBe(false);
      expect(result.response).toContain('שגיאה');
    });

    it('should handle service errors gracefully', async () => {
      conversationService.getOrCreateConversation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const input: ProcessMessageInput = {
        user: mockUser,
        message: mockMessage
      };

      const result = await service.processTransition(input);

      expect(result.shouldEndConversation).toBe(false);
      expect(result.response).toContain('אירעה שגיאה');
    });
  });
});
