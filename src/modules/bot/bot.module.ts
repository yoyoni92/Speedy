/**
 * Bot Module - WhatsApp Conversation Management
 *
 * Provides intelligent bot conversation system with state persistence
 * for fleet management operations via WhatsApp.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FleetModule } from '../fleet/fleet.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';

// Bot Services
import { StateMachineService } from './services/state-machine.service';
import { ConversationService } from './services/conversation.service';
import { MenuBuilderService } from './services/menu-builder.service';
import { ResponseGeneratorService } from './services/response-generator.service';

// Bot Interfaces (for dependency injection)
import { IStateMachineService } from './interfaces/bot.interface';
import { IConversationService } from './interfaces/bot.interface';
import { IMenuBuilderService } from './interfaces/bot.interface';
import { IResponseGeneratorService } from './interfaces/bot.interface';

// Fleet Services (for menu building and data access)
import { IMotorcycleService } from '../fleet/interfaces/motorcycle.interface';
import { IClientService } from '../fleet/interfaces/client.interface';

@Module({
  imports: [
    PrismaModule,      // Database access
    FleetModule,       // Fleet services for data access
    MaintenanceModule  // Maintenance services for calculations
  ],
  providers: [
    // Bot Services
    {
      provide: StateMachineService,
      useClass: StateMachineService
    },
    {
      provide: ConversationService,
      useClass: ConversationService
    },
    {
      provide: MenuBuilderService,
      useClass: MenuBuilderService
    },
    {
      provide: ResponseGeneratorService,
      useClass: ResponseGeneratorService
    },

    // Concrete implementations
    StateMachineService,
    ConversationService,
    MenuBuilderService,
    ResponseGeneratorService
  ],
  exports: [
    // Export concrete services (now used as tokens)
    StateMachineService,
    ConversationService,
    MenuBuilderService,
    ResponseGeneratorService,

    // Export the module itself for use in other modules
    BotModule
  ]
})
export class BotModule {}
