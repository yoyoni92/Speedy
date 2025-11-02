import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CourierService } from './courier.service';
import { PrismaService } from '../../../database/prisma.service';
import { MotorcycleType } from '@prisma/client';

describe('CourierService', () => {
  let service: CourierService;
  let prismaService: jest.Mocked<PrismaService>;
  let mockPrismaService: any;

  const mockCourier = {
    id: 'courier-1',
    userId: 'user-1',
    name: 'John Doe',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    phoneNumber: '+972501234567',
    role: 'COURIER' as const,
    isActive: true,
  };

  const mockMileageReport = {
    id: 'report-1',
    motorcycleId: 'motorcycle-1',
    courierId: 'courier-1',
    mileage: 15000,
    reportedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      courier: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      mileageReport: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      motorcycle: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    // Set default mock behaviors
    mockPrismaService.courier.create.mockReturnValue(Promise.resolve(mockCourier));
    mockPrismaService.courier.update.mockReturnValue(Promise.resolve(mockCourier));
    mockPrismaService.courier.findUnique.mockImplementation((args: any) => {
      if (args.where.id === 'non-existent') {
        return Promise.resolve(null);
      }
      return Promise.resolve(mockCourier);
    });
    mockPrismaService.courier.findMany.mockReturnValue(Promise.resolve([mockCourier]));
    mockPrismaService.courier.count.mockReturnValue(Promise.resolve(1));
    mockPrismaService.courier.delete.mockReturnValue(Promise.resolve(mockCourier));
    mockPrismaService.user.create.mockReturnValue(Promise.resolve(mockUser));
    mockPrismaService.user.findUnique.mockImplementation((args: any) => {
      if (args.where.phoneNumber === 'existing-phone' || args.where.id === 'user-1') {
        return Promise.resolve(mockUser);
      }
      return Promise.resolve(null);
    });
    mockPrismaService.mileageReport.create.mockReturnValue(Promise.resolve(mockMileageReport));
    mockPrismaService.mileageReport.findMany.mockReturnValue(Promise.resolve([mockMileageReport]));
    mockPrismaService.motorcycle.update.mockReturnValue(Promise.resolve({ id: 'motorcycle-1', licensePlate: '123', type: MotorcycleType.MOTORCYCLE_125, currentMileage: 15000 } as any));
    mockPrismaService.motorcycle.findUnique.mockReturnValue(Promise.resolve({ id: 'motorcycle-1', assignedCourierId: 'courier-1' } as any));
    mockPrismaService.$transaction.mockResolvedValue({ user: mockUser, courier: mockCourier });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CourierService>(CourierService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
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
    it('should create a courier successfully', async () => {
      const input = {
        userId: 'user-1',
        name: 'John Doe',
      };

      // Override user existence check (first call) and courier existence check (second call)
      (prismaService.courier.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      const result = await service.create(input);

      expect(result).toEqual({
        id: 'courier-1',
        name: 'John Doe',
        isActive: true,
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {

      await expect(service.create({
        userId: 'non-existent',
        name: 'John Doe'
      })).rejects.toThrow('משתמש לא נמצא');
    });

    it('should throw ConflictException when courier already exists for user', async () => {
      // Override to simulate existing courier for this user
      (prismaService.courier.findUnique as any).mockReturnValueOnce(Promise.resolve(mockCourier));

      await expect(service.create({
        userId: 'user-1',
        name: 'John Doe'
      })).rejects.toThrow('שליח כבר קיים עבור משתמש זה');
    });
  });

  describe('createWithUser', () => {
    it('should create user and courier successfully', async () => {
      const input = {
        phoneNumber: '+972501234567',
        courierName: 'John Doe',
      };

      const mockTransactionResult = {
        user: mockUser,
        courier: mockCourier,
      };

      const result = await service.createWithUser(input);

      expect(result.userId).toBe('user-1');
      expect(result.name).toBe('John Doe');
    });

    it('should throw ConflictException when phone number already exists', async () => {
      // Override to simulate existing phone number
      (prismaService.user.findUnique as any).mockReturnValueOnce(Promise.resolve(mockUser));

      await expect(service.createWithUser({
        phoneNumber: '+972501234567',
        courierName: 'John Doe'
      })).rejects.toThrow('מספר טלפון כבר רשום במערכת');
    });
  });

  describe('findById', () => {
    it('should return courier when found', async () => {

      const result = await service.findById('courier-1');

      expect(result).toEqual({
        id: 'courier-1',
        name: 'John Doe',
        isActive: true,
      });
    });

    it('should return null when courier not found', async () => {

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return courier for user', async () => {

      const result = await service.findByUserId('user-1');

      expect(result?.name).toBe('John Doe');
    });
  });

  describe('findAll', () => {
    it('should return paginated couriers', async () => {

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.couriers).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by active status', async () => {

      await service.findAll({ page: 1, limit: 10, isActive: true });

      expect(prismaService.courier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true })
        })
      );
    });
  });

  describe('findWithMotorcycles', () => {
    it('should return couriers with motorcycle counts', async () => {
      const courierWithMotorcycles = {
        ...mockCourier,
        motorcycles: [
          { id: 'm1', licensePlate: '123', type: '125', currentMileage: 1000, isActive: true }
        ]
      };

      // Override to return couriers with motorcycles
      (prismaService.courier.findMany as any).mockReturnValueOnce(Promise.resolve([courierWithMotorcycles]));
      (prismaService.courier.count as any).mockReturnValueOnce(Promise.resolve(1));

      const result = await service.findWithMotorcycles();

      expect(result.couriers[0]!.motorcycleCount).toBe(1);
      expect(result.couriers[0]!.motorcycleCount).toBe(1);
    });
  });

  describe('reportMileage', () => {
    it('should report mileage successfully', async () => {
      const input = {
        motorcycleId: 'motorcycle-1',
        mileage: 15000,
        courierId: 'courier-1',
      };

      const mockMotorcycle = {
        id: 'motorcycle-1',
        assignedCourierId: 'courier-1',
        currentMileage: 10000,
      };


      await expect(service.reportMileage(input)).resolves.not.toThrow();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when courier does not exist', async () => {

      await expect(service.reportMileage({
        motorcycleId: 'motorcycle-1',
        mileage: 15000,
        courierId: 'non-existent'
      })).rejects.toThrow('שליח לא נמצא');
    });

    it('should throw NotFoundException when motorcycle does not exist', async () => {
      // Override to simulate non-existent motorcycle
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      await expect(service.reportMileage({
        motorcycleId: 'non-existent',
        mileage: 15000,
        courierId: 'courier-1'
      })).rejects.toThrow('אופנוע לא נמצא');
    });

    it('should throw ConflictException when motorcycle not assigned to courier', async () => {
      const mockMotorcycle = {
        id: 'motorcycle-1',
        assignedCourierId: 'different-courier',
        currentMileage: 10000,
      };

      // Override to simulate motorcycle assigned to different courier
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(mockMotorcycle));

      await expect(service.reportMileage({
        motorcycleId: 'motorcycle-1',
        mileage: 15000,
        courierId: 'courier-1'
      })).rejects.toThrow('אופנוע לא מוקצה לשליח זה');
    });

    it('should throw ConflictException when mileage is lower than current', async () => {
      const mockMotorcycle = {
        id: 'motorcycle-1',
        assignedCourierId: 'courier-1',
        currentMileage: 20000,
      };

      // Override to simulate motorcycle with higher current mileage
      (prismaService.motorcycle.findUnique as any).mockReturnValueOnce(Promise.resolve(mockMotorcycle));

      await expect(service.reportMileage({
        motorcycleId: 'motorcycle-1',
        mileage: 15000,
        courierId: 'courier-1'
      })).rejects.toThrow('הקילומטראז החדש לא יכול להיות נמוך מהקילומטראז הנוכחי');
    });
  });

  describe('getMileageReports', () => {
    it('should return mileage reports for courier', async () => {
      const mockReports = [mockMileageReport];

      const result = await service.getMileageReports('courier-1');

      expect(result).toEqual(mockReports);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');


      await service.getMileageReports('courier-1', startDate, endDate);

      expect(prismaService.mileageReport.findMany).toHaveBeenCalledWith({
        where: {
          courierId: 'courier-1',
          reportedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: expect.any(Object),
        orderBy: { reportedAt: 'desc' }
      });
    });
  });

  describe('getStats', () => {
    it('should return courier statistics', async () => {
      const reports = [
        { mileage: 10000 },
        { mileage: 15000 },
      ];
      // Override to return specific reports for stats calculation
      (prismaService.mileageReport.findMany as any).mockReturnValueOnce(Promise.resolve(reports));

      const result = await service.getStats({
        courierId: 'courier-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      expect(result.totalMileage).toBe(5000); // 15000 - 10000
      expect(result.totalReports).toBe(2);
    });
  });

  describe('getPerformance', () => {
    it('should return performance metrics for week', async () => {
      // Override to return empty reports for week calculation
      (prismaService.mileageReport.findMany as any).mockReturnValueOnce(Promise.resolve([]));

      const result = await service.getPerformance({
        courierId: 'courier-1',
        period: 'week'
      });

      expect(result.period).toBe('week');
      expect(result.totalMileage).toBe(0);
    });

    it('should throw ConflictException for invalid period', async () => {

      await expect(service.getPerformance({
        courierId: 'courier-1',
        period: 'invalid' as any
      })).rejects.toThrow('תקופה לא חוקית');
    });
  });

  describe('deactivate', () => {
    it('should deactivate courier', async () => {
      const inactiveCourier = { ...mockCourier, isActive: false };
      // Override to return inactive courier
      (prismaService.courier.update as any).mockReturnValueOnce(Promise.resolve(inactiveCourier));

      const result = await service.deactivate('courier-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('activate', () => {
    it('should activate courier', async () => {
      const inactiveCourier = { ...mockCourier, isActive: false };
      const activeCourier = { ...mockCourier, isActive: true };
      // Override to simulate inactive courier first, then return active courier
      (prismaService.courier.findUnique as any).mockReturnValueOnce(Promise.resolve(inactiveCourier));
      (prismaService.courier.update as any).mockReturnValueOnce(Promise.resolve(activeCourier));

      const result = await service.activate('courier-1');

      expect(result.isActive).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete courier', async () => {

      await expect(service.delete('courier-1')).resolves.not.toThrow();

      expect(prismaService.courier.delete).toHaveBeenCalledWith({
        where: { id: 'courier-1' }
      });
    });
  });

  describe('isPhoneNumberAvailable', () => {
    it('should return true when phone number is available', async () => {

      const result = await service.isPhoneNumberAvailable('+972501234567');

      expect(result).toBe(true);
    });

    it('should return false when phone number is taken', async () => {
      // Override to simulate existing phone number
      (prismaService.user.findUnique as any).mockReturnValueOnce(Promise.resolve(mockUser));

      const result = await service.isPhoneNumberAvailable('+972501234567');

      expect(result).toBe(false);
    });
  });

  describe('getUnderutilizedCouriers', () => {
    it('should return couriers with low motorcycle count', async () => {
      const couriers = [
        {
          ...mockCourier,
          _count: { motorcycles: 2 }
        },
        {
          ...mockCourier,
          id: 'courier-2',
          _count: { motorcycles: 10 }
        }
      ];
      // Override to return couriers with motorcycle counts
      (prismaService.courier.findMany as any).mockReturnValueOnce(Promise.resolve(couriers));

      const result = await service.getUnderutilizedCouriers(5);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('courier-1');
    });
  });
});
