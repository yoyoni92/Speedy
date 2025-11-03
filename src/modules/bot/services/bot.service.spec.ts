/**
 * Bot Service - Unit Tests
 *
 * Tests for the main bot orchestrator that coordinates WhatsApp messaging
 * with conversation state management.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { StateMachineService } from './state-machine.service';
import { WhatsAppService, WhatsAppMessage } from '../../whatsapp/services/whatsapp.service';
import { ConversationState } from '../enums/conversation-state.enum';

describe('BotService', () => {
  let service: BotService;
  let stateMachine: any;
  let whatsApp: any;

const mockUser = {
  id: 'user_123',
  phoneNumber: '0501234567',
  role: 'COURIER' as const,
  isActive: true,
};

  const mockWhatsAppMessage: WhatsAppMessage = {
    id: 'msg_123',
    from: '972501234567',
    type: 'text',
    timestamp: '1640995200',
    text: { body: 'שלום' },
  };

  beforeEach(async () => {
    const mockStateMachine = {
      processTransition: jest.fn(),
    };

    const mockWhatsAppService = {
      sendTextMessage: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        {
          provide: StateMachineService,
          useValue: mockStateMachine,
        },
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    stateMachine = module.get(StateMachineService);
    whatsApp = module.get(WhatsAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMessage', () => {
    it('should process text message successfully', async () => {
      const mockResult = {
        conversation: {
          id: 'conv_123',
          userId: 'user_123',
          state: ConversationState.IDLE,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        response: 'שלום! במה אוכל לעזור?',
        shouldEndConversation: false,
      };

      stateMachine.processTransition.mockResolvedValue(mockResult);
      whatsApp.sendTextMessage.mockResolvedValue('msg_456');

      const result = await service.processMessage(mockWhatsAppMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_456');
      expect(result.conversationEnded).toBe(false);
      expect(stateMachine.processTransition).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: '972501234567', // Phone number as ID
          phoneNumber: '972501234567',
          role: 'COURIER',
          isActive: true,
        }),
        message: expect.objectContaining({
          body: 'שלום',
          from: '972501234567',
          messageId: 'msg_123',
          type: 'text',
        }),
      });
      expect(whatsApp.sendTextMessage).toHaveBeenCalledWith(
        '972501234567',
        'שלום! במה אוכל לעזור?',
      );
    });

    it('should process interactive button message', async () => {
      const buttonMessage: WhatsAppMessage = {
        id: 'msg_123',
        from: '972501234567',
        type: 'interactive',
        timestamp: '1640995200',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'btn_yes',
            title: 'כן',
          },
        },
      };

      const mockResult = {
        conversation: {
          id: 'conv_123',
          userId: 'user_123',
          state: ConversationState.AWAITING_CONFIRMATION,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        response: 'מאושר!',
        shouldEndConversation: true,
      };

      stateMachine.processTransition.mockResolvedValue(mockResult);
      whatsApp.sendTextMessage.mockResolvedValue('msg_456');

      const result = await service.processMessage(buttonMessage);

      expect(result.success).toBe(true);
      expect(result.conversationEnded).toBe(true);
      expect(stateMachine.processTransition).toHaveBeenCalledWith({
        user: expect.any(Object),
        message: expect.objectContaining({
          body: 'btn_yes', // Button ID as body
        }),
      });
    });

    it('should process list reply message', async () => {
      const listMessage: WhatsAppMessage = {
        id: 'msg_123',
        from: '972501234567',
        type: 'interactive',
        timestamp: '1640995200',
        interactive: {
          type: 'list_reply',
          list_reply: {
            id: 'moto_123',
            title: 'הונדה CBR',
            description: '125cc',
          },
        },
      };

      const mockResult = {
        conversation: {
          id: 'conv_123',
          userId: 'user_123',
          state: ConversationState.AWAITING_MILEAGE_INPUT,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        response: 'נבחר: הונדה CBR',
        shouldEndConversation: false,
      };

      stateMachine.processTransition.mockResolvedValue(mockResult);
      whatsApp.sendTextMessage.mockResolvedValue('msg_456');

      const result = await service.processMessage(listMessage);

      expect(result.success).toBe(true);
      expect(result.conversationEnded).toBe(false);
      expect(stateMachine.processTransition).toHaveBeenCalledWith({
        user: expect.any(Object),
        message: expect.objectContaining({
          body: 'moto_123', // List item ID as body
        }),
      });
    });

    it('should handle state machine errors gracefully', async () => {
      stateMachine.processTransition.mockRejectedValue(new Error('Database error'));
      whatsApp.sendTextMessage.mockResolvedValue('error_msg_123');

      const result = await service.processMessage(mockWhatsAppMessage);

      expect(result.success).toBe(false);
      expect(result.conversationEnded).toBe(false);
      expect(result.error).toBe('Database error');
      expect(whatsApp.sendTextMessage).toHaveBeenCalledWith(
        '972501234567',
        'אירעה שגיאה בעיבוד ההודעה. אנא נסה שוב.',
      );
    });

    it('should handle WhatsApp send errors gracefully', async () => {
      const mockResult = {
        conversation: {
          id: 'conv_123',
          userId: 'user_123',
          state: ConversationState.IDLE,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        response: 'תגובה',
        shouldEndConversation: false,
      };

      stateMachine.processTransition.mockResolvedValue(mockResult);
      whatsApp.sendTextMessage.mockRejectedValue(new Error('WhatsApp API error'));

      const result = await service.processMessage(mockWhatsAppMessage);

      expect(result.success).toBe(false);
      expect(result.conversationEnded).toBe(false);
      expect(result.error).toBe('WhatsApp API error');
    });

    it('should use provided authenticated user', async () => {
      const authenticatedUser = {
        id: 'auth_user_123',
        phoneNumber: '0509998888',
        role: 'ADMIN' as const,
        isActive: true,
      };

      const mockResult = {
        conversation: {
          id: 'conv_123',
          userId: 'auth_user_123',
          state: ConversationState.IDLE,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        response: 'ברוך הבא אדמין!',
        shouldEndConversation: false,
      };

      stateMachine.processTransition.mockResolvedValue(mockResult);
      whatsApp.sendTextMessage.mockResolvedValue('msg_456');

      const result = await service.processMessage(mockWhatsAppMessage, authenticatedUser);

      expect(stateMachine.processTransition).toHaveBeenCalledWith({
        user: authenticatedUser,
        message: expect.any(Object),
      });
    });
  });

  describe('sendProactiveMessage', () => {
    it('should send proactive message successfully', async () => {
      whatsApp.sendTextMessage.mockResolvedValue('proactive_msg_123');

      const result = await service.sendProactiveMessage(
        '0501234567',
        'התזכורת שלך',
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('proactive_msg_123');
      expect(result.conversationEnded).toBe(false);
      expect(whatsApp.sendTextMessage).toHaveBeenCalledWith(
        '0501234567',
        'התזכורת שלך',
      );
    });

    it('should handle WhatsApp errors in proactive messaging', async () => {
      whatsApp.sendTextMessage.mockRejectedValue(new Error('Send failed'));

      const result = await service.sendProactiveMessage(
        '0501234567',
        'התזכורת שלך',
        mockUser,
      );

      expect(result.success).toBe(false);
      expect(result.conversationEnded).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });

  describe('sendMaintenanceReminder', () => {
    it('should send maintenance reminder successfully', async () => {
      whatsApp.sendTextMessage.mockResolvedValue('reminder_msg_123');

      const result = await service.sendMaintenanceReminder(
        '0501234567',
        'moto_123',
        10000,
        9500,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('reminder_msg_123');
      expect(result.conversationEnded).toBe(false);

      const expectedMessage = expect.stringContaining('תזכורת תחזוקה');
      expect(whatsApp.sendTextMessage).toHaveBeenCalledWith(
        '0501234567',
        expectedMessage,
      );
    });

    it('should calculate correct km until service', async () => {
      whatsApp.sendTextMessage.mockResolvedValue('reminder_msg_123');

      await service.sendMaintenanceReminder(
        '0501234567',
        'moto_123',
        10000,
        9500,
      );

      expect(whatsApp.sendTextMessage).toHaveBeenCalledWith(
        '0501234567',
        expect.stringContaining('עוד 500 ק"מ'),
      );
    });
  });

  describe('requestMileageReport', () => {
    it('should send mileage report request successfully', async () => {
      whatsApp.sendTextMessage.mockResolvedValue('request_msg_123');

      const result = await service.requestMileageReport('0501234567', 'moto_123');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('request_msg_123');
      expect(result.conversationEnded).toBe(false);

      expect(whatsApp.sendTextMessage).toHaveBeenCalledWith(
        '0501234567',
        expect.stringContaining('דיווח קילומטראז נדרש'),
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when WhatsApp is configured', () => {
      whatsApp.getHealthStatus.mockReturnValue({
        status: 'healthy',
        configured: true,
      });

      const result = service.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.whatsAppConfigured).toBe(true);
      expect(result.stateMachineHealthy).toBe(true);
    });

    it('should return development status when WhatsApp is not configured', () => {
      whatsApp.getHealthStatus.mockReturnValue({
        status: 'development',
        configured: false,
      });

      const result = service.getHealthStatus();

      expect(result.status).toBe('development');
      expect(result.whatsAppConfigured).toBe(false);
      expect(result.stateMachineHealthy).toBe(true);
    });
  });
});
