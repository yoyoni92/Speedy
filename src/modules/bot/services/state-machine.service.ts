/**
 * State Machine Service - Bot Conversation Flow Management
 *
 * Handles conversation state transitions, validation, and context management
 * for the WhatsApp bot interface.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConversationState } from '../enums/conversation-state.enum';
import {
  IStateMachineService,
  ProcessMessageResult,
  StateTransition,
  StateTransitionCondition,
  StateTransitionAction
} from '../interfaces/bot.interface';
import { ConversationInfo, ConversationContext, UserRole, ProcessMessageInput } from '../../../types/domain.types';
import { ConversationService } from './conversation.service';
import { MenuBuilderService } from './menu-builder.service';
import { ResponseGeneratorService } from './response-generator.service';

@Injectable()
export class StateMachineService implements IStateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly menuBuilderService: MenuBuilderService,
    private readonly responseGeneratorService: ResponseGeneratorService,
  ) {}

  /**
   * Process state transition based on user input
   */
  async processTransition(input: ProcessMessageInput): Promise<ProcessMessageResult> {
    try {
      // Get or create conversation
      let conversation = await this.conversationService.getOrCreateConversation(input.user.id);

      // Check if conversation is expired
      if (this.conversationService.isConversationExpired(conversation)) {
        await this.resetConversation(input.user.id);
        conversation = await this.conversationService.getOrCreateConversation(input.user.id);
      }

      const currentState = conversation.state;
      const userInput = input.message.body.trim();

      this.logger.debug(`Processing transition: ${currentState} -> ? (input: ${userInput})`);

      // Process based on current state
      const result = await this.handleStateTransition(currentState, userInput, input, conversation);

      // Update conversation with new state and context
      await this.conversationService.updateConversationState(
        input.user.id,
        result.conversation.state,
        result.conversation.context
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`State transition error: ${errorMessage}`, errorStack);

      // Return error response and keep conversation in current state
      // Use a fallback conversation if service fails
      let conversation: ConversationInfo;
      try {
        conversation = await this.conversationService.getOrCreateConversation(input.user.id);
      } catch (fallbackError) {
        // Create a fallback conversation if database is unavailable
        conversation = {
          id: 'fallback-conversation',
          userId: input.user.id,
          state: ConversationState.IDLE,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      return {
        conversation,
        response: this.responseGeneratorService.generateErrorMessage({
          code: 'STATE_TRANSITION_ERROR',
          message: errorMessage,
          userMessage: 'אירעה שגיאה בעיבוד ההודעה. אנא נסה שוב.'
        }),
        shouldEndConversation: false,
        metadata: { error: errorMessage }
      };
    }
  }

  /**
   * Handle state-specific transition logic
   */
  private async handleStateTransition(
    currentState: ConversationState,
    userInput: string,
    input: ProcessMessageInput,
    conversation: ConversationInfo
  ): Promise<ProcessMessageResult> {
    const context = conversation.context || {};

    switch (currentState) {
      case ConversationState.IDLE:
        return this.handleIdleState(input, conversation);

      case ConversationState.AWAITING_MENU_SELECTION:
        return this.handleMenuSelectionState(userInput, input, conversation);

      case ConversationState.AWAITING_MOTORCYCLE_SELECTION:
        return this.handleMotorcycleSelectionState(userInput, input, conversation);

      case ConversationState.AWAITING_MILEAGE_INPUT:
        return this.handleMileageInputState(userInput, input, conversation);

      case ConversationState.AWAITING_MOTORCYCLE_DATA:
        return this.handleMotorcycleDataState(userInput, input, conversation);

      case ConversationState.AWAITING_CONFIRMATION:
        return this.handleConfirmationState(userInput, input, conversation);

      default:
        throw new BadRequestException(`Unknown conversation state: ${currentState}`);
    }
  }

  /**
   * Handle IDLE state - start new conversation
   */
  private async handleIdleState(
    input: ProcessMessageInput,
    conversation: ConversationInfo
  ): Promise<ProcessMessageResult> {
    // Generate welcome message and main menu
    const welcomeMessage = this.responseGeneratorService.generateWelcomeMessage(
      input.user.courier?.name || 'משתמש'
    );

    const mainMenu = await this.menuBuilderService.buildMainMenu(input.user.id);
    const menuMessage = this.responseGeneratorService.generateMenuMessage(mainMenu);

    const response = `${welcomeMessage}\n\n${menuMessage}`;

    return {
      conversation: {
        ...conversation,
        state: ConversationState.AWAITING_MENU_SELECTION,
        context: {
          ...conversation.context,
          lastMenuSelection: null as any,
          errorCount: 0
        }
      },
      response,
      shouldEndConversation: false
    };
  }

  /**
   * Handle menu selection state
   */
  private async handleMenuSelectionState(
    userInput: string,
    input: ProcessMessageInput,
    conversation: ConversationInfo
  ): Promise<ProcessMessageResult> {
    const mainMenu = await this.menuBuilderService.buildMainMenu(input.user.id);

    // Validate menu selection
    const selectedOption = mainMenu.options.find(opt => opt.key === userInput && opt.enabled);

    if (!selectedOption) {
      const context = conversation.context || {};
      const errorCount = (context.errorCount || 0) + 1;

      if (errorCount >= 3) {
        // Too many invalid attempts, reset conversation
        await this.resetConversation(input.user.id);
        return this.handleIdleState(input, conversation);
      }

      const errorResponse = this.responseGeneratorService.generateErrorMessage({
        code: 'INVALID_MENU_SELECTION',
        message: 'Invalid menu selection',
        userMessage: 'בחירה לא תקינה. אנא בחר אפשרות מהתפריט.'
      });

      const menuMessage = this.responseGeneratorService.generateMenuMessage(mainMenu);
      const response = `${errorResponse}\n\n${menuMessage}`;

      return {
        conversation: {
          ...conversation,
          context: { ...context, errorCount }
        },
        response,
        shouldEndConversation: false
      };
    }

    // Valid selection - update context and transition
    const newContext = {
      ...conversation.context,
      lastMenuSelection: selectedOption.key,
      errorCount: 0
    };

    // Determine next state based on selection
    let nextState: ConversationState = ConversationState.AWAITING_MENU_SELECTION; // Default stay in menu
    let response = '';

    switch (selectedOption.action) {
      case 'report_mileage':
        nextState = ConversationState.AWAITING_MOTORCYCLE_SELECTION;
        const mileageMenu = await this.menuBuilderService.buildMotorcycleSelectionMenu(input.user.id);
        response = this.responseGeneratorService.generateMenuMessage(mileageMenu);
        break;

      case 'view_maintenance':
        nextState = ConversationState.AWAITING_MOTORCYCLE_SELECTION;
        const maintenanceMenu = await this.menuBuilderService.buildMotorcycleSelectionMenu(input.user.id);
        response = this.responseGeneratorService.generateMenuMessage(maintenanceMenu);
        break;

      case 'admin_actions':
        if (input.user.role === UserRole.ADMIN) {
          nextState = ConversationState.AWAITING_MENU_SELECTION;
          const adminMenu = await this.menuBuilderService.buildAdminMenu(input.user.id);
          response = this.responseGeneratorService.generateMenuMessage(adminMenu);
        } else {
          response = this.responseGeneratorService.generateErrorMessage({
            code: 'UNAUTHORIZED',
            message: 'User not authorized for admin actions',
            userMessage: 'אין לך הרשאה לבצע פעולות אלה.'
          });
        }
        break;

      case 'end_conversation':
        response = this.responseGeneratorService.generateSuccessMessage('conversation_ended');
        nextState = ConversationState.IDLE;
        return {
          conversation: {
            ...conversation,
            state: nextState,
            context: newContext
          },
          response,
          shouldEndConversation: true
        };

      default:
        response = this.responseGeneratorService.generateErrorMessage({
          code: 'UNKNOWN_ACTION',
          message: 'Unknown menu action',
          userMessage: 'פעולה לא מוכרת.'
        });
    }

    return {
      conversation: {
        ...conversation,
        state: nextState,
        context: newContext
      },
      response,
      shouldEndConversation: false
    };
  }

  /**
   * Handle motorcycle selection state
   */
  private async handleMotorcycleSelectionState(
    userInput: string,
    input: ProcessMessageInput,
    conversation: ConversationInfo
  ): Promise<ProcessMessageResult> {
    const motorcycleMenu = await this.menuBuilderService.buildMotorcycleSelectionMenu(input.user.id);
    const selectedOption = motorcycleMenu.options.find(opt => opt.key === userInput && opt.enabled);

    if (!selectedOption) {
      const context = conversation.context || {};
      const errorCount = (context.errorCount || 0) + 1;

      if (errorCount >= 3) {
        await this.resetConversation(input.user.id);
        const idleResult = await this.handleIdleState(input, conversation);
        return idleResult;
      }

      const errorResponse = this.responseGeneratorService.generateErrorMessage({
        code: 'INVALID_MOTORCYCLE_SELECTION',
        message: 'Invalid motorcycle selection',
        userMessage: 'בחירת אופנוע לא תקינה. אנא בחר אופנוע מהרשימה.'
      });

      const menuMessage = this.responseGeneratorService.generateMenuMessage(motorcycleMenu);
      const response = `${errorResponse}\n\n${menuMessage}`;

      return {
        conversation: {
          ...conversation,
          context: { ...context, errorCount }
        },
        response,
        shouldEndConversation: false
      };
    }

    // Valid selection - extract motorcycle ID and determine next action
    const motorcycleId = selectedOption.key; // Assuming key contains motorcycle ID
    const newContext = {
      ...conversation.context,
      selectedMotorcycleId: motorcycleId,
      errorCount: 0
    };

    // Determine next state based on previous action
    const lastAction = conversation.context?.lastMenuSelection;
    let nextState: ConversationState;
    let response = '';

    if (lastAction === 'report_mileage') {
      nextState = ConversationState.AWAITING_MILEAGE_INPUT;
      response = 'אנא הכנס את הקילומטראז\' הנוכחי של האופנוע:';
    } else if (lastAction === 'view_maintenance') {
      nextState = ConversationState.AWAITING_MENU_SELECTION;
      // This would show maintenance info - for now just acknowledge
      response = this.responseGeneratorService.generateSuccessMessage(
        'motorcycle_selected',
        { motorcycleId }
      );
    } else {
      nextState = ConversationState.AWAITING_MILEAGE_INPUT;
      response = 'אנא הכנס את הקילומטראז\' הנוכחי של האופנוע:';
    }

    return {
      conversation: {
        ...conversation,
        state: nextState,
        context: newContext
      },
      response,
      shouldEndConversation: false
    };
  }

  /**
   * Handle mileage input state
   */
  private async handleMileageInputState(
    userInput: string,
    input: ProcessMessageInput,
    conversation: ConversationInfo
  ): Promise<ProcessMessageResult> {
    // Validate mileage input
    const mileage = parseInt(userInput.trim());

    if (isNaN(mileage) || mileage < 0 || mileage > 999999) {
      const context = conversation.context || {};
      const errorCount = (context.errorCount || 0) + 1;

      if (errorCount >= 3) {
        await this.resetConversation(input.user.id);
        const idleResult = await this.handleIdleState(input, conversation);
        return idleResult;
      }

      const errorResponse = this.responseGeneratorService.generateErrorMessage({
        code: 'INVALID_MILEAGE',
        message: 'Invalid mileage value',
        userMessage: 'ערך קילומטראז\' לא תקין. אנא הכנס מספר חיובי עד 999,999.'
      });

      return {
        conversation: {
          ...conversation,
          context: { ...context, errorCount }
        },
        response: errorResponse,
        shouldEndConversation: false
      };
    }

    const newContext = {
      ...conversation.context,
      pendingMileage: mileage,
      errorCount: 0
    };

    // Move to confirmation state
    const confirmationMessage = `האם אתה מאשר לדווח קילומטראז\' של ${mileage.toLocaleString('he-IL')} ק"מ?\n\n1. כן - אשר דיווח\n2. לא - בטל`;

    return {
      conversation: {
        ...conversation,
        state: ConversationState.AWAITING_CONFIRMATION,
        context: newContext
      },
      response: confirmationMessage,
      shouldEndConversation: false
    };
  }

  /**
   * Handle motorcycle data state (for admin operations)
   */
  private async handleMotorcycleDataState(
    userInput: string,
    input: ProcessMessageInput,
    conversation: ConversationInfo
  ): Promise<ProcessMessageResult> {
    // Placeholder for admin motorcycle data operations
    const response = this.responseGeneratorService.generateErrorMessage({
      code: 'NOT_IMPLEMENTED',
      message: 'Motorcycle data operations not yet implemented',
      userMessage: 'פעולה זו טרם מומשה.'
    });

    return {
      conversation: {
        ...conversation,
        state: ConversationState.AWAITING_MENU_SELECTION
      },
      response,
      shouldEndConversation: false
    };
  }

  /**
   * Handle confirmation state
   */
  private async handleConfirmationState(
    userInput: string,
    input: ProcessMessageInput,
    conversation: ConversationInfo
  ): Promise<ProcessMessageResult> {
    const context = conversation.context || {};

    if (userInput === '1' || userInput.toLowerCase() === 'כן') {
      // Confirmed - process the action
      const pendingMileage = context.pendingMileage;

      if (pendingMileage && context.selectedMotorcycleId) {
        // This would integrate with mileage reporting service
        // For now, just acknowledge
        const successMessage = this.responseGeneratorService.generateSuccessMessage(
          'mileage_reported',
          { mileage: pendingMileage, motorcycleId: context.selectedMotorcycleId }
        );

        return {
          conversation: {
            ...conversation,
            state: ConversationState.IDLE,
            context: {}
          },
          response: successMessage,
          shouldEndConversation: true
        };
      }
    } else if (userInput === '2' || userInput.toLowerCase() === 'לא') {
      // Cancelled - go back to menu
      const mainMenu = await this.menuBuilderService.buildMainMenu(input.user.id);
      const menuMessage = this.responseGeneratorService.generateMenuMessage(mainMenu);

      return {
        conversation: {
          ...conversation,
          state: ConversationState.AWAITING_MENU_SELECTION,
          context: (({ pendingMileage, ...rest }) => rest)(context) // Remove pendingMileage
        },
        response: `הדיווח בוטל.\n\n${menuMessage}`,
        shouldEndConversation: false
      };
    }

    // Invalid confirmation input
    const errorCount = (context.errorCount || 0) + 1;

    if (errorCount >= 3) {
      await this.resetConversation(input.user.id);
      const idleResult = await this.handleIdleState(input, conversation);
      return idleResult;
    }

    const errorResponse = this.responseGeneratorService.generateErrorMessage({
      code: 'INVALID_CONFIRMATION',
      message: 'Invalid confirmation input',
      userMessage: 'אנא השב "1" לאישור או "2" לביטול.'
    });

    return {
      conversation: {
        ...conversation,
        context: { ...context, errorCount }
      },
      response: `${errorResponse}\n\nהאם אתה מאשר לדווח קילומטראז\' של ${(context.pendingMileage || 0).toLocaleString('he-IL')} ק"מ?\n\n1. כן - אשר דיווח\n2. לא - בטל`,
      shouldEndConversation: false
    };
  }

  /**
   * Validate if transition is allowed
   */
  async validateTransition(
    fromState: ConversationState,
    toState: ConversationState,
    input: ProcessMessageInput
  ): Promise<boolean> {
    // Define valid transitions
    const validTransitions: Record<ConversationState, ConversationState[]> = {
      [ConversationState.IDLE]: [ConversationState.AWAITING_MENU_SELECTION],
      [ConversationState.AWAITING_MENU_SELECTION]: [
        ConversationState.AWAITING_MOTORCYCLE_SELECTION,
        ConversationState.IDLE
      ],
      [ConversationState.AWAITING_MOTORCYCLE_SELECTION]: [
        ConversationState.AWAITING_MILEAGE_INPUT,
        ConversationState.AWAITING_MENU_SELECTION
      ],
      [ConversationState.AWAITING_MILEAGE_INPUT]: [ConversationState.AWAITING_CONFIRMATION],
      [ConversationState.AWAITING_MOTORCYCLE_DATA]: [ConversationState.AWAITING_MENU_SELECTION],
      [ConversationState.AWAITING_CONFIRMATION]: [
        ConversationState.IDLE,
        ConversationState.AWAITING_MENU_SELECTION
      ]
    };

    const allowedStates = validTransitions[fromState] || [];
    return allowedStates.includes(toState);
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(currentState: ConversationState): StateTransition[] {
    // This could be expanded with more complex transition definitions
    // For now, return basic transitions
    const transitions: StateTransition[] = [];

    switch (currentState) {
      case ConversationState.IDLE:
        transitions.push({
          fromState: ConversationState.IDLE,
          toState: ConversationState.AWAITING_MENU_SELECTION
        });
        break;

      case ConversationState.AWAITING_MENU_SELECTION:
        transitions.push(
          {
            fromState: ConversationState.AWAITING_MENU_SELECTION,
            toState: ConversationState.AWAITING_MOTORCYCLE_SELECTION
          },
          {
            fromState: ConversationState.AWAITING_MENU_SELECTION,
            toState: ConversationState.IDLE
          }
        );
        break;

      // Add more transitions as needed
    }

    return transitions;
  }

  /**
   * Reset conversation to initial state
   */
  async resetConversation(userId: string): Promise<void> {
    await this.conversationService.updateConversationState(
      userId,
      ConversationState.IDLE,
      {}
    );
  }
}
