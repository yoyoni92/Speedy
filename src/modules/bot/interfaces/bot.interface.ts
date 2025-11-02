/**
 * Bot Module Interfaces
 *
 * Defines the core interfaces for the bot state machine and conversation management.
 */

import { ConversationState } from '../enums/conversation-state.enum';
import { ConversationInfo, ConversationContext, ProcessMessageInput } from '../../../types/domain.types';

/**
 * Result of processing a message through the state machine
 */
export interface ProcessMessageResult {
  /** Updated conversation state */
  conversation: ConversationInfo;

  /** Response message to send back to user */
  response: string;

  /** Whether the conversation should end */
  shouldEndConversation: boolean;

  /** Additional context or metadata */
  metadata?: Record<string, any>;
}

/**
 * State transition definition
 */
export interface StateTransition {
  /** Current state */
  fromState: ConversationState;

  /** Target state after transition */
  toState: ConversationState;

  /** Conditions that must be met for transition */
  conditions?: StateTransitionCondition[];

  /** Actions to perform during transition */
  actions?: StateTransitionAction[];
}

/**
 * Condition for state transition
 */
export interface StateTransitionCondition {
  /** Type of condition to check */
  type: 'user_input' | 'context_value' | 'user_role' | 'motorcycle_available';

  /** Field to check */
  field?: string;

  /** Expected value */
  expectedValue?: any;

  /** Custom validation function */
  validator?: (input: ProcessMessageInput) => boolean;
}

/**
 * Action to perform during state transition
 */
export interface StateTransitionAction {
  /** Type of action */
  type: 'update_context' | 'clear_context' | 'set_menu_selection' | 'validate_mileage' | 'record_maintenance';

  /** Action parameters */
  params?: Record<string, any>;

  /** Custom action function */
  executor?: (input: ProcessMessageInput, context: ConversationContext) => Promise<void>;
}

/**
 * Menu definition for user interaction
 */
export interface BotMenu {
  /** Menu identifier */
  id: string;

  /** Menu title in Hebrew */
  title: string;

  /** Available options */
  options: BotMenuOption[];

  /** Footer text */
  footer?: string;

  /** Whether back navigation is allowed */
  allowBack?: boolean;

  /** Timeout in minutes */
  timeoutMinutes?: number;
}

/**
 * Menu option definition
 */
export interface BotMenuOption {
  /** Option key (what user types) */
  key: string;

  /** Display label in Hebrew */
  label: string;

  /** Option description */
  description?: string;

  /** Whether option is enabled */
  enabled?: boolean;

  /** Next state after selection */
  nextState?: ConversationState;

  /** Action to perform */
  action?: string;
}

/**
 * Response generation options
 */
export interface ResponseOptions {
  /** Include RTL markers */
  rtl?: boolean;

  /** Include direction markers */
  includeDirectionMarkers?: boolean;

  /** Format numbers in Hebrew style */
  formatNumbers?: boolean;

  /** Response template to use */
  template?: string;

  /** Variables to substitute in template */
  variables?: Record<string, any>;
}

/**
 * Bot service interface - main orchestrator
 */
export interface IBotService {
  /**
   * Process an incoming WhatsApp message
   * @param input Message processing input
   * @returns Processing result
   */
  processMessage(input: ProcessMessageInput): Promise<ProcessMessageResult>;

  /**
   * Get current menu for user
   * @param userId User identifier
   * @param state Current conversation state
   * @returns Menu definition or null
   */
  getCurrentMenu(userId: string, state: ConversationState): Promise<BotMenu | null>;

  /**
   * End conversation for user
   * @param userId User identifier
   */
  endConversation(userId: string): Promise<void>;
}

/**
 * State machine service interface
 */
export interface IStateMachineService {
  /**
   * Process state transition based on user input
   * @param input Message processing input
   * @returns Transition result
   */
  processTransition(input: ProcessMessageInput): Promise<ProcessMessageResult>;

  /**
   * Validate if transition is allowed
   * @param fromState Current state
   * @param toState Target state
   * @param input Message input
   * @returns Whether transition is valid
   */
  validateTransition(
    fromState: ConversationState,
    toState: ConversationState,
    input: ProcessMessageInput
  ): Promise<boolean>;

  /**
   * Get available transitions from current state
   * @param currentState Current conversation state
   * @returns Array of possible transitions
   */
  getAvailableTransitions(currentState: ConversationState): StateTransition[];

  /**
   * Reset conversation to initial state
   * @param userId User identifier
   */
  resetConversation(userId: string): Promise<void>;
}

/**
 * Conversation service interface
 */
export interface IConversationService {
  /**
   * Get or create conversation for user
   * @param userId User identifier
   * @returns Conversation info
   */
  getOrCreateConversation(userId: string): Promise<ConversationInfo>;

  /**
   * Update conversation state
   * @param userId User identifier
   * @param state New state
   * @param context Updated context
   * @returns Updated conversation
   */
  updateConversationState(
    userId: string,
    state: ConversationState,
    context?: Partial<ConversationContext>
  ): Promise<ConversationInfo>;

  /**
   * Update conversation context
   * @param userId User identifier
   * @param context Context updates
   * @returns Updated conversation
   */
  updateConversationContext(
    userId: string,
    context: Partial<ConversationContext>
  ): Promise<ConversationInfo>;

  /**
   * Delete conversation
   * @param userId User identifier
   */
  deleteConversation(userId: string): Promise<void>;

  /**
   * Check if conversation is expired
   * @param conversation Conversation to check
   * @returns Whether conversation is expired
   */
  isConversationExpired(conversation: ConversationInfo): boolean;

  /**
   * Clean up expired conversations
   * @returns Number of conversations cleaned up
   */
  cleanupExpiredConversations(): Promise<number>;
}

/**
 * Menu builder service interface
 */
export interface IMenuBuilderService {
  /**
   * Build main menu based on user role
   * @param userId User identifier
   * @returns Menu definition
   */
  buildMainMenu(userId: string): Promise<BotMenu>;

  /**
   * Build motorcycle selection menu
   * @param userId User identifier
   * @param filterOptions Additional filter options
   * @returns Menu definition
   */
  buildMotorcycleSelectionMenu(
    userId: string,
    filterOptions?: Record<string, any>
  ): Promise<BotMenu>;

  /**
   * Build maintenance action menu
   * @param motorcycleId Motorcycle identifier
   * @returns Menu definition
   */
  buildMaintenanceMenu(motorcycleId: string): Promise<BotMenu>;

  /**
   * Build mileage reporting menu
   * @param motorcycleId Motorcycle identifier
   * @returns Menu definition
   */
  buildMileageReportingMenu(motorcycleId: string): Promise<BotMenu>;

  /**
   * Build admin menu
   * @param userId Admin user identifier
   * @returns Menu definition
   */
  buildAdminMenu(userId: string): Promise<BotMenu>;

  /**
   * Render menu as formatted text
   * @param menu Menu definition
   * @param options Formatting options
   * @returns Formatted menu text
   */
  renderMenu(menu: BotMenu, options?: ResponseOptions): string;
}

/**
 * Response generator service interface
 */
export interface IResponseGeneratorService {
  /**
   * Generate welcome message
   * @param userName User name
   * @param options Response options
   * @returns Formatted welcome message
   */
  generateWelcomeMessage(userName: string, options?: ResponseOptions): string;

  /**
   * Generate error message
   * @param error Error information
   * @param options Response options
   * @returns Formatted error message
   */
  generateErrorMessage(
    error: { code: string; message: string; userMessage?: string },
    options?: ResponseOptions
  ): string;

  /**
   * Generate success message
   * @param action Action that succeeded
   * @param data Additional data
   * @param options Response options
   * @returns Formatted success message
   */
  generateSuccessMessage(
    action: string,
    data?: Record<string, any>,
    options?: ResponseOptions
  ): string;

  /**
   * Generate motorcycle information message
   * @param motorcycle Motorcycle data
   * @param options Response options
   * @returns Formatted motorcycle info
   */
  generateMotorcycleInfo(
    motorcycle: any,
    options?: ResponseOptions
  ): string;

  /**
   * Generate maintenance reminder message
   * @param maintenanceData Maintenance information
   * @param options Response options
   * @returns Formatted maintenance reminder
   */
  generateMaintenanceReminder(
    maintenanceData: any,
    options?: ResponseOptions
  ): string;

  /**
   * Generate menu navigation message
   * @param menu Menu definition
   * @param options Response options
   * @returns Formatted menu message
   */
  generateMenuMessage(menu: BotMenu, options?: ResponseOptions): string;

  /**
   * Format Hebrew text with proper RTL support
   * @param text Text to format
   * @param options Formatting options
   * @returns Formatted Hebrew text
   */
  formatHebrewText(text: string, options?: ResponseOptions): string;
}
