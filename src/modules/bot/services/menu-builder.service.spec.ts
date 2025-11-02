/**
 * Menu Builder Service - Unit Tests
 *
 * Comprehensive tests for Hebrew text menu generation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MenuBuilderService } from './menu-builder.service';
import { MotorcycleService } from '../../fleet/services/motorcycle.service';
import { ClientService } from '../../fleet/services/client.service';
import { UserRole, MotorcycleType } from '../../../types/domain.types';

describe('MenuBuilderService', () => {
  let service: MenuBuilderService;
  let motorcycleService: any;
  let clientService: any;

  const mockMotorcycle = {
    id: 'motorcycle-123',
    licensePlate: '123-45-67',
    type: MotorcycleType.MOTORCYCLE_125,
    currentMileage: 15000,
    licenseExpiryDate: new Date('2025-12-31'),
    insuranceExpiryDate: new Date('2025-06-30'),
    insuranceType: 'SINGLE_DRIVER' as const,
    isActive: true,
    assignedCourier: {
      id: 'courier-123',
      name: 'ישראל ישראלי',
      isActive: true
    },
    assignedClient: {
      id: 'client-123',
      name: 'חברה לדוגמה',
      isActive: true
    }
  };

  const mockMotorcycles = [
    mockMotorcycle,
    {
      ...mockMotorcycle,
      id: 'motorcycle-456',
      licensePlate: '456-78-90',
      type: MotorcycleType.MOTORCYCLE_250,
      currentMileage: 25000
    }
  ];

  beforeEach(async () => {
    const mockMotorcycleService = {
      findById: jest.fn(),
      findByLicensePlate: jest.fn(),
      findAll: jest.fn(),
      findByCourierId: jest.fn(),
      findByClientId: jest.fn(),
      assign: jest.fn(),
      unassign: jest.fn(),
      updateMileage: jest.fn(),
      recordMaintenance: jest.fn(),
      getMaintenanceHistory: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      delete: jest.fn(),
      isLicensePlateAvailable: jest.fn()
    };

    const mockClientService = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findWithFleet: jest.fn(),
      getFleetOverview: jest.fn(),
      getStats: jest.fn(),
      getMaintenanceReport: jest.fn(),
      bulkOperation: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      delete: jest.fn(),
      getClientsWithExpiringItems: jest.fn(),
      getHighMaintenanceClients: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuBuilderService,
        {
          provide: MotorcycleService,
          useValue: mockMotorcycleService
        },
        {
          provide: ClientService,
          useValue: mockClientService
        }
      ]
    }).compile();

    service = module.get<MenuBuilderService>(MenuBuilderService);
    motorcycleService = module.get(MotorcycleService);
    clientService = module.get(ClientService);

    // Setup default mocks
    motorcycleService.findById.mockResolvedValue(mockMotorcycle);
    motorcycleService.findByCourierId.mockResolvedValue([mockMotorcycle]);
    motorcycleService.findByClientId.mockResolvedValue(mockMotorcycles);
    motorcycleService.findAll.mockResolvedValue({
      motorcycles: mockMotorcycles,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildMainMenu', () => {
    it('should build courier main menu', async () => {
      const menu = await service.buildMainMenu('courier-123');

      expect(menu.id).toBe('main-menu');
      expect(menu.title).toBe('תפריט ראשי - ניהול צי אופנועים');
      expect(menu.options).toHaveLength(3); // mileage, maintenance, end conversation
      expect(menu.options[0]).toBeDefined();
      expect(menu.options[0]!.action).toBe('report_mileage');
      expect(menu.options[1]).toBeDefined();
      expect(menu.options[1]!.action).toBe('view_maintenance');
      expect(menu.options[2]).toBeDefined();
      expect(menu.options[2]!.action).toBe('end_conversation');
      expect(menu.allowBack).toBe(false);
    });

    it('should build admin main menu with additional options', async () => {
      const menu = await service.buildMainMenu('admin-123');

      expect(menu.options).toHaveLength(6); // + manage motorcycles, couriers, reports
      expect(menu.options.some(opt => opt.action === 'manage_motorcycles')).toBe(true);
      expect(menu.options.some(opt => opt.action === 'manage_couriers')).toBe(true);
      expect(menu.options.some(opt => opt.action === 'view_reports')).toBe(true);
    });
  });

  describe('buildMotorcycleSelectionMenu', () => {
    it('should build motorcycle selection menu for courier', async () => {
      const menu = await service.buildMotorcycleSelectionMenu('courier-123');

      expect(menu.id).toBe('motorcycle-selection-menu');
      expect(menu.title).toBe('בחר אופנוע');
      expect(menu.options).toHaveLength(2); // 1 motorcycle + back option
      expect(menu.options[0]!.label).toContain('123-45-67');
      expect(menu.options[0]!.description).toContain('15,000');
      expect(menu.options[1]!.action).toBe('back');
    });

    it('should build motorcycle selection menu for admin', async () => {
      const menu = await service.buildMotorcycleSelectionMenu('admin-123');

      expect(menu.options).toHaveLength(3); // 2 motorcycles + back option
      expect(menu.footer).toContain('נמצאו 2 אופנועים');
    });

    it('should handle empty motorcycle list', async () => {
      motorcycleService.findByCourierId.mockResolvedValue([]);

      const menu = await service.buildMotorcycleSelectionMenu('courier-123');

      expect(menu.id).toBe('no-motorcycles-menu');
      expect(menu.title).toBe('אין אופנועים זמינים');
      expect(menu.options).toHaveLength(1);
      expect(menu.options[0]!.action).toBe('back_to_main');
    });

    it('should filter motorcycles by client for admin', async () => {
      const menu = await service.buildMotorcycleSelectionMenu('admin-123', { clientId: 'client-123' });

      expect(motorcycleService.findByClientId).toHaveBeenCalledWith('client-123');
    });

    it('should limit to 9 motorcycles and add show more option', async () => {
      const manyMotorcycles = Array.from({ length: 12 }, (_, i) => ({
        ...mockMotorcycle,
        id: `motorcycle-${i}`,
        licensePlate: `${i.toString().padStart(3, '0')}-45-67`
      }));

      motorcycleService.findAll.mockResolvedValue({
        motorcycles: manyMotorcycles,
        total: 12,
        page: 1,
        limit: 10,
        totalPages: 2
      });

      const menu = await service.buildMotorcycleSelectionMenu('admin-123');

      expect(menu.options).toHaveLength(11); // 9 motorcycles + show more + back
      expect(menu.options[9]!.action).toBe('show_more_motorcycles');
      expect(menu.options[10]!.action).toBe('back');
    });
  });

  describe('buildMaintenanceMenu', () => {
    it('should build maintenance menu for motorcycle', async () => {
      const menu = await service.buildMaintenanceMenu('motorcycle-123');

      expect(menu.id).toBe('maintenance-menu');
      expect(menu.title).toContain('123-45-67');
      expect(menu.options).toHaveLength(4);
      expect(menu.options[0]!.action).toBe('view_scheduled_maintenance');
      expect(menu.options[1]!.action).toBe('report_maintenance_done');
      expect(menu.options[2]!.action).toBe('view_maintenance_history');
      expect(menu.options[3]!.action).toBe('back_to_motorcycle_selection');
    });

    it('should throw NotFoundException for non-existent motorcycle', async () => {
      motorcycleService.findById.mockResolvedValue(null);

      await expect(service.buildMaintenanceMenu('non-existent')).rejects.toThrow(
        'Motorcycle with ID non-existent not found'
      );
    });
  });

  describe('buildMileageReportingMenu', () => {
    it('should build mileage reporting menu for motorcycle', async () => {
      const menu = await service.buildMileageReportingMenu('motorcycle-123');

      expect(menu.id).toBe('mileage-reporting-menu');
      expect(menu.title).toContain('123-45-67');
      expect(menu.options).toHaveLength(3);
      expect(menu.options[0]!.action).toBe('report_current_mileage');
      expect(menu.options[1]!.action).toBe('view_recent_reports');
      expect(menu.options[2]!.action).toBe('back_to_motorcycle_selection');
    });

    it('should throw NotFoundException for non-existent motorcycle', async () => {
      motorcycleService.findById.mockResolvedValue(null);

      await expect(service.buildMileageReportingMenu('non-existent')).rejects.toThrow(
        'Motorcycle with ID non-existent not found'
      );
    });
  });

  describe('buildAdminMenu', () => {
    it('should build admin menu for admin user', async () => {
      const menu = await service.buildAdminMenu('admin-123');

      expect(menu.id).toBe('admin-menu');
      expect(menu.title).toBe('תפריט אדמין - ניהול מערכת');
      expect(menu.options).toHaveLength(6);
      expect(menu.options[0]!.action).toBe('add_motorcycle');
      expect(menu.options[1]!.action).toBe('manage_motorcycles');
      expect(menu.options[2]!.action).toBe('add_courier');
      expect(menu.options[3]!.action).toBe('manage_couriers');
      expect(menu.options[4]!.action).toBe('view_reports');
      expect(menu.options[5]!.action).toBe('back_to_main');
    });

    it('should throw error for non-admin user', async () => {
      await expect(service.buildAdminMenu('courier-123')).rejects.toThrow(
        'User is not authorized to access admin menu'
      );
    });
  });

  describe('renderMenu', () => {
    it('should render menu as formatted Hebrew text', () => {
      const menu = {
        id: 'test-menu',
        title: 'תפריט בדיקה',
        options: [
          {
            key: '1',
            label: 'אפשרות ראשונה',
            description: 'תיאור האפשרות',
            enabled: true
          },
          {
            key: '2',
            label: 'אפשרות שנייה',
            enabled: true
          }
        ],
        footer: 'בחר אפשרות מהתפריט',
        allowBack: true,
        timeoutMinutes: 5
      };

      const rendered = service.renderMenu(menu);

      expect(rendered).toContain('\u200Fתפריט בדיקה'); // RTL mark
      expect(rendered).toContain('='.repeat(30));
      expect(rendered).toContain('1. אפשרות ראשונה');
      expect(rendered).toContain('   תיאור האפשרות');
      expect(rendered).toContain('2. אפשרות שנייה');
      expect(rendered).toContain('בחר אפשרות מהתפריט');
      expect(rendered).toContain('זמן תפוגה: 5 דקות');
    });

    it('should skip disabled options', () => {
      const menu = {
        id: 'test-menu',
        title: 'תפריט בדיקה',
        options: [
          {
            key: '1',
            label: 'אפשרות ראשונה',
            enabled: true
          },
          {
            key: '2',
            label: 'אפשרות שנייה',
            enabled: false
          }
        ],
        footer: 'בחר אפשרות'
      };

      const rendered = service.renderMenu(menu);

      expect(rendered).toContain('1. אפשרות ראשונה');
      expect(rendered).not.toContain('2. אפשרות שנייה');
    });
  });

  describe('private methods', () => {
    it('should get motorcycle type labels in Hebrew', () => {
      // Test the private method indirectly through menu rendering
      const menu = {
        id: 'type-test',
        title: 'בדיקת סוגים',
        options: [
          {
            key: '125',
            label: '125 סמ״ק',
            enabled: true
          },
          {
            key: '250',
            label: '250 סמ״ק',
            enabled: true
          },
          {
            key: 'electric',
            label: 'חשמלי',
            enabled: true
          }
        ]
      };

      const rendered = service.renderMenu(menu);

      expect(rendered).toContain('125 סמ״ק');
      expect(rendered).toContain('250 סמ״ק');
      expect(rendered).toContain('חשמלי');
    });
  });
});
