import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceCalculatorService } from './maintenance-calculator.service';
import { PrismaService } from '@/database/prisma.service';
import { MaintenanceType, MotorcycleType } from '@prisma/client';
import { MaintenanceHistory } from '../interfaces/calculator.interface';

describe('MaintenanceCalculatorService', () => {
  let service: MaintenanceCalculatorService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceCalculatorService,
        {
          provide: PrismaService,
          useValue: {
            maintenanceHistory: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MaintenanceCalculatorService>(MaintenanceCalculatorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('125cc motorcycle maintenance calculation', () => {
    it('should calculate first small maintenance at 4000km for new motorcycle', async () => {
      // Arrange
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue([]);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 500,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(4000);
      expect(result.dueIn).toBe(3500);
      expect(result.intervalKm).toBe(4000);
      expect(result.cyclePosition).toBe(0);
    });

    it('should calculate next maintenance as large after one small maintenance', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'mock-id-1',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 4000,
          performedAt: new Date('2025-01-01'),
          notes: null,
          createdAt: new Date('2025-01-01'),
        },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 4500,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.LARGE);
      expect(result.nextMileage).toBe(8000);
      expect(result.dueIn).toBe(3500);
      expect(result.cyclePosition).toBe(1);
    });

    it('should calculate next maintenance as small after one small and one large', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'mock-id-1',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 4000,
          performedAt: new Date('2025-01-01'),
          notes: null,
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'mock-id-2',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.LARGE,
          mileageAtMaintenance: 8000,
          performedAt: new Date('2025-02-01'),
          notes: null,
          createdAt: new Date('2025-02-01'),
        },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 9000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(12000);
      expect(result.dueIn).toBe(3000);
      expect(result.cyclePosition).toBe(0);
    });

    it('should handle current mileage exactly at a milestone', async () => {
      // Arrange
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue([]);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 4000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(8000);
      expect(result.dueIn).toBe(4000);
    });
  });

  describe('250cc motorcycle maintenance calculation', () => {
    it('should calculate first small maintenance at 5000km for new motorcycle', async () => {
      // Arrange
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue([]);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_250,
        currentMileage: 1000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(5000);
      expect(result.dueIn).toBe(4000);
      expect(result.intervalKm).toBe(5000);
      expect(result.cyclePosition).toBe(0);
    });

    it('should calculate second small maintenance after first small', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'mock-id-1',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 5000,
          performedAt: new Date('2025-01-01'),
          notes: null,
          createdAt: new Date('2025-01-01'),
        },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_250,
        currentMileage: 7500,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(10000);
      expect(result.dueIn).toBe(2500);
      expect(result.cyclePosition).toBe(1);
    });

    it('should calculate large maintenance after two small maintenances', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'mock-id-1',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 5000,
          performedAt: new Date('2025-01-01'),
          notes: null,
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'mock-id-2',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 10000,
          performedAt: new Date('2025-02-01'),
          notes: null,
          createdAt: new Date('2025-02-01'),
        },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_250,
        currentMileage: 12000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.LARGE);
      expect(result.nextMileage).toBe(15000);
      expect(result.dueIn).toBe(3000);
      expect(result.cyclePosition).toBe(2);
    });

    it('should return to small maintenance after completing the cycle', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'mock-id-1',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 5000,
          performedAt: new Date('2025-01-01'),
          notes: null,
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'mock-id-2',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 10000,
          performedAt: new Date('2025-02-01'),
          notes: null,
          createdAt: new Date('2025-02-01'),
        },
        {
          id: 'mock-id-3',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.LARGE,
          mileageAtMaintenance: 15000,
          performedAt: new Date('2025-03-01'),
          notes: null,
          createdAt: new Date('2025-03-01'),
        },
      ];
      jest.spyOn(prismaService.maintenanceHistory, 'findMany').mockResolvedValue(mockHistory);

      // Act
      const result = await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_250,
        currentMileage: 16000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.SMALL);
      expect(result.nextMileage).toBe(20000);
      expect(result.dueIn).toBe(4000);
      expect(result.cyclePosition).toBe(0);
    });
  });

  describe('Electric motorcycle', () => {
    it('should return no maintenance needed for electric motorcycles', async () => {
      // Act
      const result = await service.calculateNext({
        type: MotorcycleType.ELECTRIC,
        currentMileage: 5000,
      });

      // Assert
      expect(result.type).toBe(MaintenanceType.NONE);
      expect(result.nextMileage).toBeNull();
      expect(result.dueIn).toBeNull();
      expect(result.intervalKm).toBe(0);
    });
  });

  describe('Fetching maintenance history', () => {
    it('should fetch maintenance history if not provided', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'mock-id-1',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 4000,
          performedAt: new Date('2025-01-01'),
          notes: null,
          createdAt: new Date('2025-01-01'),
        },
      ];
      const findManySpy = jest.spyOn(prismaService.maintenanceHistory, 'findMany')
        .mockResolvedValue(mockHistory);

      // Act
      await service.calculateNext({
        motorcycleId: 'test-id',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 4500,
      });

      // Assert
      expect(findManySpy).toHaveBeenCalledWith({
        where: { motorcycleId: 'test-id' },
        orderBy: { mileageAtMaintenance: 'asc' },
        select: {
          maintenanceType: true,
          mileageAtMaintenance: true,
        },
      });
    });

    it('should not fetch maintenance history if already provided', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'mock-id-1',
          motorcycleId: 'test-id',
          maintenanceType: MaintenanceType.SMALL,
          mileageAtMaintenance: 4000,
          performedAt: new Date('2025-01-01'),
          notes: null,
          createdAt: new Date('2025-01-01'),
        },
      ];
      const findManySpy = jest.spyOn(prismaService.maintenanceHistory, 'findMany');

      // Act
      await service.calculateNext({
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 4500,
        maintenanceHistory: mockHistory,
      });

      // Assert
      expect(findManySpy).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown motorcycle type', async () => {
      // Act & Assert
      await expect(service.calculateNext({
        type: 'UNKNOWN_TYPE' as any,
        currentMileage: 1000,
      })).rejects.toThrow('Unknown motorcycle type: UNKNOWN_TYPE');
    });
  });
});
