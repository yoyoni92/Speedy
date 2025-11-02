import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { MotorcycleService } from './motorcycle.service';
import { PrismaService } from '../../../database/prisma.service';
import { MotorcycleType } from '@prisma/client';

describe('MotorcycleService', () => {
  let service: MotorcycleService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockMotorcycle = {
    id: 'motorcycle-1',
    licensePlate: '1234567',
    type: MotorcycleType.MOTORCYCLE_125,
    currentMileage: 10000,
    licenseExpiryDate: new Date('2025-12-31'),
    insuranceExpiryDate: new Date('2025-12-31'),
    insuranceType: 'SINGLE_DRIVER' as const,
    isActive: true,
    assignedCourierId: 'courier-1',
    assignedClientId: 'client-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedCourier: { id: 'courier-1', name: 'John Doe' },
    assignedClient: { id: 'client-1', name: 'Client ABC' },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      motorcycle: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      courier: {
        findUnique: jest.fn(),
      },
      client: {
        findUnique: jest.fn(),
      },
      maintenanceHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    // Set default mock behaviors
    mockPrismaService.motorcycle.create.mockReturnValue(Promise.resolve(mockMotorcycle));
    mockPrismaService.motorcycle.update.mockReturnValue(Promise.resolve(mockMotorcycle));
    mockPrismaService.motorcycle.findUnique.mockImplementation((args: any) => {
      if (args.where.id === 'non-existent' || args.where.licensePlate === 'existing-plate') {
        return Promise.resolve(null);
      }
      return Promise.resolve(mockMotorcycle);
    });
    mockPrismaService.motorcycle.findMany.mockReturnValue(Promise.resolve([mockMotorcycle]));
    mockPrismaService.motorcycle.count.mockReturnValue(Promise.resolve(1));
    mockPrismaService.motorcycle.delete.mockReturnValue(Promise.resolve(mockMotorcycle));
    mockPrismaService.motorcycle.findFirst.mockReturnValue(Promise.resolve(null));
    mockPrismaService.courier.findUnique.mockImplementation((args: any) => {
      if (args.where.id === 'non-existent') {
        return Promise.resolve(null);
      }
      return Promise.resolve({ id: 'courier-1', name: 'John Doe' });
    });
    mockPrismaService.client.findUnique.mockReturnValue(Promise.resolve({ id: 'client-1', name: 'Client ABC' }));
    mockPrismaService.maintenanceHistory.create.mockReturnValue(Promise.resolve({}));
    mockPrismaService.maintenanceHistory.findMany.mockReturnValue(Promise.resolve([]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MotorcycleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MotorcycleService>(MotorcycleService);
    prismaService = module.get(PrismaService);
  });

  afterEach(async () => {
    // Clean up any pending operations
    await new Promise(resolve => setImmediate(resolve));

    // Reset all mocks to ensure clean state
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a motorcycle successfully', async () => {
      // Override to simulate no existing license plate
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      const input = {
        licensePlate: '1234567',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 10000,
        licenseExpiryDate: new Date('2025-12-31'),
        insuranceExpiryDate: new Date('2025-12-31'),
        insuranceType: 'SINGLE_DRIVER' as const,
        assignedCourierId: 'courier-1',
        assignedClientId: 'client-1',
      };

      const result = await service.create(input);

      expect(prismaService.motorcycle.create).toHaveBeenCalledWith({
        data: input,
        include: {
          assignedCourier: { select: { id: true, name: true } },
          assignedClient: { select: { id: true, name: true } },
        },
      });
      expect(result).toEqual({
        id: 'motorcycle-1',
        licensePlate: '1234567',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 10000,
        licenseExpiryDate: new Date('2025-12-31'),
        insuranceExpiryDate: new Date('2025-12-31'),
        insuranceType: 'SINGLE_DRIVER',
        isActive: true,
        assignedCourier: { id: 'courier-1', name: 'John Doe' },
        assignedClient: { id: 'client-1', name: 'Client ABC' },
      });
    });

    it('should throw ConflictException when license plate already exists', async () => {
      // Override to simulate existing license plate
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(mockMotorcycle));

      await expect(service.create({
        licensePlate: '1234567',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 10000,
        licenseExpiryDate: new Date('2025-12-31'),
        insuranceExpiryDate: new Date('2025-12-31'),
        insuranceType: 'SINGLE_DRIVER' as const,
      })).rejects.toThrow('מספר רישיון כבר קיים במערכת');
    });

    it('should throw NotFoundException when assigned courier does not exist', async () => {
      // Override to simulate no existing license plate first
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(null));
      // Override to simulate non-existent courier
      (prismaService.courier.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      await expect(service.create({
        licensePlate: '1234567',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 10000,
        licenseExpiryDate: new Date('2025-12-31'),
        insuranceExpiryDate: new Date('2025-12-31'),
        insuranceType: 'SINGLE_DRIVER' as const,
        assignedCourierId: 'non-existent-courier',
      })).rejects.toThrow('שליח לא נמצא');
    });
  });

  describe('update', () => {
    it('should update a motorcycle successfully', async () => {
      const input = {
        id: 'motorcycle-1',
        licensePlate: '7654321',
      };

      const updatedMotorcycle = { ...mockMotorcycle, licensePlate: '7654321' };
      // First call: check motorcycle exists (returns motorcycle)
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(mockMotorcycle));
      // Second call: check license plate uniqueness (returns null - no conflict)
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(null));
      // Override to return updated motorcycle
      (prismaService.motorcycle.update as any).mockReturnValueOnce(Promise.resolve(updatedMotorcycle));

      const result = await service.update(input);

      expect(result.licensePlate).toBe('7654321');
    });

    it('should throw NotFoundException when motorcycle does not exist', async () => {

      await expect(service.update({
        id: 'non-existent',
        licensePlate: '1234567'
      })).rejects.toThrow('אופנוע לא נמצא');
    });
  });

  describe('findById', () => {
    it('should return motorcycle when found', async () => {

      const result = await service.findById('motorcycle-1');

      expect(result).toEqual({
        id: 'motorcycle-1',
        licensePlate: '1234567',
        type: MotorcycleType.MOTORCYCLE_125,
        currentMileage: 10000,
        licenseExpiryDate: new Date('2025-12-31'),
        insuranceExpiryDate: new Date('2025-12-31'),
        insuranceType: 'SINGLE_DRIVER',
        isActive: true,
        assignedCourier: { id: 'courier-1', name: 'John Doe' },
        assignedClient: { id: 'client-1', name: 'Client ABC' },
      });
    });

    it('should return null when motorcycle not found', async () => {

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated motorcycles', async () => {
      const mockMotorcycles = [mockMotorcycle];

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.motorcycles).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by type', async () => {

      await service.findAll({ page: 1, limit: 10, type: '125' });

      expect(prismaService.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: '125' })
        })
      );
    });
  });

  describe('findByCourierId', () => {
    it('should return motorcycles assigned to courier', async () => {

      const result = await service.findByCourierId('courier-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.assignedCourier?.id).toBe('courier-1');
    });

    it('should throw NotFoundException when courier does not exist', async () => {

      await expect(service.findByCourierId('non-existent')).rejects.toThrow('שליח לא נמצא');
    });
  });

  describe('assign', () => {
    it('should assign motorcycle to courier and client', async () => {

      const result = await service.assign({
        motorcycleId: 'motorcycle-1',
        courierId: 'courier-1',
        clientId: 'client-1',
      });

      expect(result.assignedCourier?.id).toBe('courier-1');
      expect(result.assignedClient?.id).toBe('client-1');
    });

    it('should throw NotFoundException when motorcycle does not exist', async () => {

      await expect(service.assign({
        motorcycleId: 'non-existent',
        courierId: 'courier-1',
      })).rejects.toThrow('אופנוע לא נמצא');
    });
  });

  describe('unassign', () => {
    it('should unassign motorcycle from courier and client', async () => {
      const assignedMotorcycle = { ...mockMotorcycle };
      const unassignedMotorcycle = { ...mockMotorcycle, assignedCourierId: null, assignedClientId: null, assignedCourier: null, assignedClient: null };

      // Override to return unassigned motorcycle
      (prismaService.motorcycle.update as any).mockReturnValueOnce(Promise.resolve(unassignedMotorcycle));

      const result = await service.unassign('motorcycle-1');

      expect(result.assignedCourier).toBeNull();
      expect(result.assignedClient).toBeNull();
    });
  });

  describe('updateMileage', () => {
    it('should update mileage successfully', async () => {
      // Override to return motorcycle with updated mileage
      const updatedMileageMotorcycle = { ...mockMotorcycle, currentMileage: 15000 };
      (prismaService.motorcycle.update as any).mockReturnValueOnce(Promise.resolve(updatedMileageMotorcycle));

      const result = await service.updateMileage({
        motorcycleId: 'motorcycle-1',
        mileage: 15000,
      });

      expect(result.currentMileage).toBe(15000);
    });

    it('should throw BadRequestException when new mileage is lower than current', async () => {

      await expect(service.updateMileage({
        motorcycleId: 'motorcycle-1',
        mileage: 5000,
      })).rejects.toThrow('הקילומטראז החדש לא יכול להיות נמוך מהקילומטראז הנוכחי');
    });
  });

  describe('recordMaintenance', () => {
    it('should record maintenance and update mileage if provided', async () => {

      const result = await service.recordMaintenance({
        motorcycleId: 'motorcycle-1',
        maintenanceType: 'SMALL',
        mileageAtMaintenance: 12000,
        notes: 'Oil change',
      });

      expect(prismaService.maintenanceHistory.create).toHaveBeenCalledWith({
        data: {
          motorcycleId: 'motorcycle-1',
          maintenanceType: 'SMALL',
          mileageAtMaintenance: 12000,
          notes: 'Oil change',
        },
      });
    });
  });

  describe('getMaintenanceHistory', () => {
    it('should return maintenance history for motorcycle', async () => {
      const mockHistory = [{ id: '1', maintenanceType: 'SMALL', performedAt: new Date() }];
      // Override to return mock history
      (prismaService.maintenanceHistory.findMany as any).mockReturnValueOnce(Promise.resolve(mockHistory));

      const result = await service.getMaintenanceHistory('motorcycle-1');

      expect(result).toEqual(mockHistory);
    });
  });

  describe('deactivate', () => {
    it('should deactivate motorcycle', async () => {
      const inactiveMotorcycle = { ...mockMotorcycle, isActive: false };
      // Override to return inactive motorcycle
      (prismaService.motorcycle.update as any).mockReturnValueOnce(Promise.resolve(inactiveMotorcycle));

      const result = await service.deactivate('motorcycle-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('activate', () => {
    it('should activate motorcycle', async () => {
      const inactiveMotorcycle = { ...mockMotorcycle, isActive: false };
      const activeMotorcycle = { ...mockMotorcycle, isActive: true };

      const result = await service.activate('motorcycle-1');

      expect(result.isActive).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete motorcycle', async () => {

      await expect(service.delete('motorcycle-1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException when motorcycle does not exist', async () => {
      // Override to simulate non-existent motorcycle
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      await expect(service.delete('non-existent')).rejects.toThrow('אופנוע לא נמצא');
    });
  });

  describe('isLicensePlateAvailable', () => {
    it('should return true when license plate is available', async () => {

      const result = await service.isLicensePlateAvailable('1234567');

      expect(result).toBe(true);
    });

    it('should return false when license plate is taken', async () => {
      // Override to simulate taken license plate
      (prismaService.motorcycle.findFirst as any).mockReturnValueOnce(Promise.resolve(mockMotorcycle));

      const result = await service.isLicensePlateAvailable('1234567');

      expect(result).toBe(false);
    });

    it('should exclude specified motorcycle ID', async () => {

      await service.isLicensePlateAvailable('1234567', 'motorcycle-1');

      expect(prismaService.motorcycle.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: '1234567',
          id: { not: 'motorcycle-1' }
        }
      });
    });
  });
});
