/**
 * Menu Builder Service - Hebrew Text Menu Generation
 *
 * Creates text-based menus for WhatsApp bot interface with proper Hebrew formatting.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IMenuBuilderService } from '../interfaces/bot.interface';
import { BotMenu, BotMenuOption } from '../interfaces/bot.interface';
import { MotorcycleService } from '../../fleet/services/motorcycle.service';
import { ClientService } from '../../fleet/services/client.service';
import { UserRole, MotorcycleType } from '../../../types/domain.types';

@Injectable()
export class MenuBuilderService implements IMenuBuilderService {
  private readonly logger = new Logger(MenuBuilderService.name);

  constructor(
    private readonly motorcycleService: MotorcycleService,
    private readonly clientService: ClientService,
  ) {}

  /**
   * Build main menu based on user role
   */
  async buildMainMenu(userId: string): Promise<BotMenu> {
    const user = await this.getUserInfo(userId);

    const options: BotMenuOption[] = [];

    // Common options for all users
    options.push({
      key: '1',
      label: 'דווח קילומטראז\'',
      description: 'דיווח קילומטראז\' לאופנוע',
      enabled: true,
      action: 'report_mileage'
    });

    options.push({
      key: '2',
      label: 'צפה בתחזוקה',
      description: 'צפה בלוח התחזוקה',
      enabled: true,
      action: 'view_maintenance'
    });

    // Admin-only options
    if (user.role === UserRole.ADMIN) {
      options.push({
        key: '3',
        label: 'ניהול אופנועים',
        description: 'הוספה ועריכת אופנועים',
        enabled: true,
        action: 'manage_motorcycles'
      });

      options.push({
        key: '4',
        label: 'ניהול שליחים',
        description: 'ניהול משתמשי שליחים',
        enabled: true,
        action: 'manage_couriers'
      });

      options.push({
        key: '5',
        label: 'דוחות וסטטיסטיקות',
        description: 'צפה בדוחות מערכת',
        enabled: true,
        action: 'view_reports'
      });
    }

    // End conversation option
    options.push({
      key: '0',
      label: 'סיים שיחה',
      description: 'סיים את השיחה עם הבוט',
      enabled: true,
      action: 'end_conversation'
    });

    return {
      id: 'main-menu',
      title: 'תפריט ראשי - ניהול צי אופנועים',
      options,
      footer: 'אנא בחר אפשרות מהתפריט (הכנס את המספר)',
      allowBack: false,
      timeoutMinutes: 5
    };
  }

  /**
   * Build motorcycle selection menu
   */
  async buildMotorcycleSelectionMenu(
    userId: string,
    filterOptions?: Record<string, any>
  ): Promise<BotMenu> {
    const user = await this.getUserInfo(userId);

    let motorcycles: any[] = [];

    if (user.role === UserRole.COURIER && user.courierId) {
      // Couriers see only their assigned motorcycles
      motorcycles = await this.motorcycleService.findByCourierId(user.courierId);
    } else if (user.role === UserRole.ADMIN) {
      // Admins see all motorcycles, possibly filtered
      const clientId = filterOptions?.clientId;
      if (clientId) {
        motorcycles = await this.motorcycleService.findByClientId(clientId);
      } else {
        const result = await this.motorcycleService.findAll();
        motorcycles = result.motorcycles;
      }
    }

    if (motorcycles.length === 0) {
      return {
        id: 'no-motorcycles-menu',
        title: 'אין אופנועים זמינים',
        options: [
          {
            key: '0',
            label: 'חזור לתפריט ראשי',
            description: 'חזור לתפריט הראשי',
            enabled: true,
            action: 'back_to_main'
          }
        ],
        footer: 'אין אופנועים זמינים כרגע',
        allowBack: true
      };
    }

    const options: BotMenuOption[] = motorcycles.slice(0, 9).map((motorcycle, index) => ({
      key: (index + 1).toString(),
      label: `${motorcycle.licensePlate} (${this.getMotorcycleTypeLabel(motorcycle.type)})`,
      description: `קילומטראז\': ${motorcycle.currentMileage.toLocaleString('he-IL')}`,
      enabled: motorcycle.isActive,
      action: 'select_motorcycle'
    }));

    // Add back option if more than 9 motorcycles
    if (motorcycles.length > 9) {
      options.push({
        key: '*',
        label: 'הצג עוד אופנועים',
        description: 'הצג את האופנועים הנותרים',
        enabled: true,
        action: 'show_more_motorcycles'
      });
    }

    options.push({
      key: '0',
      label: 'חזור',
      description: 'חזור לתפריט הקודם',
      enabled: true,
      action: 'back'
    });

    return {
      id: 'motorcycle-selection-menu',
      title: 'בחר אופנוע',
      options,
      footer: `נמצאו ${motorcycles.length} אופנועים. בחר אופנוע מהרשימה (הכנס את המספר)`,
      allowBack: true,
      timeoutMinutes: 5
    };
  }

  /**
   * Build maintenance menu
   */
  async buildMaintenanceMenu(motorcycleId: string): Promise<BotMenu> {
    const motorcycle = await this.motorcycleService.findById(motorcycleId);

    if (!motorcycle) {
      throw new NotFoundException(`Motorcycle with ID ${motorcycleId} not found`);
    }

    // Get maintenance schedule from maintenance service
    // For now, create a basic menu
    const options: BotMenuOption[] = [
      {
        key: '1',
        label: 'צפה בתחזוקה מתוכננת',
        description: 'הצג את לוח התחזוקה',
        enabled: true,
        action: 'view_scheduled_maintenance'
      },
      {
        key: '2',
        label: 'דווח תחזוקה שבוצעה',
        description: 'דיווח על תחזוקה שהושלמה',
        enabled: true,
        action: 'report_maintenance_done'
      },
      {
        key: '3',
        label: 'היסטוריית תחזוקה',
        description: 'צפה בהיסטוריית התחזוקה',
        enabled: true,
        action: 'view_maintenance_history'
      },
      {
        key: '0',
        label: 'חזור לבחירת אופנוע',
        description: 'חזור לרשימת האופנועים',
        enabled: true,
        action: 'back_to_motorcycle_selection'
      }
    ];

    return {
      id: 'maintenance-menu',
      title: `תחזוקה - ${motorcycle.licensePlate}`,
      options,
      footer: 'בחר פעולת תחזוקה (הכנס את המספר)',
      allowBack: true,
      timeoutMinutes: 5
    };
  }

  /**
   * Build mileage reporting menu
   */
  async buildMileageReportingMenu(motorcycleId: string): Promise<BotMenu> {
    const motorcycle = await this.motorcycleService.findById(motorcycleId);

    if (!motorcycle) {
      throw new NotFoundException(`Motorcycle with ID ${motorcycleId} not found`);
    }

    const options: BotMenuOption[] = [
      {
        key: '1',
        label: 'דווח קילומטראז\' נוכחי',
        description: 'דיווח על הקילומטראז\' הנוכחי',
        enabled: true,
        action: 'report_current_mileage'
      },
      {
        key: '2',
        label: 'צפה בדיווחים אחרונים',
        description: 'צפה בדיווחי הקילומטראז\' האחרונים',
        enabled: true,
        action: 'view_recent_reports'
      },
      {
        key: '0',
        label: 'חזור לבחירת אופנוע',
        description: 'חזור לרשימת האופנועים',
        enabled: true,
        action: 'back_to_motorcycle_selection'
      }
    ];

    return {
      id: 'mileage-reporting-menu',
      title: `דיווח קילומטראז\' - ${motorcycle.licensePlate}`,
      options,
      footer: 'בחר פעולת דיווח (הכנס את המספר)',
      allowBack: true,
      timeoutMinutes: 5
    };
  }

  /**
   * Build admin menu
   */
  async buildAdminMenu(userId: string): Promise<BotMenu> {
    const user = await this.getUserInfo(userId);

    if (user.role !== UserRole.ADMIN) {
      throw new Error('User is not authorized to access admin menu');
    }

    const options: BotMenuOption[] = [
      {
        key: '1',
        label: 'הוסף אופנוע חדש',
        description: 'הוסף אופנוע חדש למערכת',
        enabled: true,
        action: 'add_motorcycle'
      },
      {
        key: '2',
        label: 'נהל אופנועים',
        description: 'ערוך או מחק אופנועים קיימים',
        enabled: true,
        action: 'manage_motorcycles'
      },
      {
        key: '3',
        label: 'הוסף שליח חדש',
        description: 'הוסף משתמש שליח חדש',
        enabled: true,
        action: 'add_courier'
      },
      {
        key: '4',
        label: 'נהל שליחים',
        description: 'ערוך או מחק משתמשי שליחים',
        enabled: true,
        action: 'manage_couriers'
      },
      {
        key: '5',
        label: 'צפה בדוחות',
        description: 'צפה בדוחות מערכת וסטטיסטיקות',
        enabled: true,
        action: 'view_reports'
      },
      {
        key: '0',
        label: 'חזור לתפריט ראשי',
        description: 'חזור לתפריט הראשי',
        enabled: true,
        action: 'back_to_main'
      }
    ];

    return {
      id: 'admin-menu',
      title: 'תפריט אדמין - ניהול מערכת',
      options,
      footer: 'בחר פעולת ניהול (הכנס את המספר)',
      allowBack: true,
      timeoutMinutes: 10
    };
  }

  /**
   * Render menu as formatted text
   */
  renderMenu(menu: BotMenu, options?: any): string {
    let text = `\u200F${menu.title}\n`; // RTL mark
    text += '='.repeat(30) + '\n\n';

    menu.options.forEach((option, index) => {
      if (option.enabled) {
        text += `${option.key}. ${option.label}\n`;
        if (option.description) {
          text += `   ${option.description}\n`;
        }
        text += '\n';
      }
    });

    if (menu.footer) {
      text += `\n${menu.footer}\n`;
    }

    if (menu.timeoutMinutes) {
      text += `\nזמן תפוגה: ${menu.timeoutMinutes} דקות\n`;
    }

    return text;
  }

  /**
   * Get user info for menu building
   */
  private async getUserInfo(userId: string): Promise<any> {
    // This would integrate with user service
    // For now, return mock data based on userId
    if (userId.includes('admin')) {
      return {
        id: userId,
        role: UserRole.ADMIN
      };
    } else {
      return {
        id: userId,
        role: UserRole.COURIER,
        courierId: `courier-${userId}`
      };
    }
  }

  /**
   * Get Hebrew label for motorcycle type
   */
  private getMotorcycleTypeLabel(type: MotorcycleType): string {
    switch (type) {
      case MotorcycleType.MOTORCYCLE_125:
        return '125 סמ״ק';
      case MotorcycleType.MOTORCYCLE_250:
        return '250 סמ״ק';
      case MotorcycleType.ELECTRIC:
        return 'חשמלי';
      default:
        return type;
    }
  }
}
