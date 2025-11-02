import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClientService } from './client.service';
import { PrismaService } from '../../../database/prisma.service';
import { MotorcycleType } from '@prisma/client';

describe('ClientService', () => {
  let service: ClientService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockClient = {
    id: 'client-1',
    name: 'Client ABC',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMotorcycle = {
    id: 'motorcycle-1',
    licensePlate: '1234567',
    type: '125' as const,
    currentMileage: 10000,
    isActive: true,
    licenseExpiryDate: new Date('2025-12-31'),
    insuranceExpiryDate: new Date('2025-12-31'),
    assignedCourier: { id: 'courier-1', name: 'John Doe' },
  };

  const mockMaintenanceRecord = {
    id: 'maintenance-1',
    motorcycleId: 'motorcycle-1',
    maintenanceType: 'SMALL' as const,
    mileageAtMaintenance: 10000,
    performedAt: new Date(),
    notes: 'Oil change',
    motorcycle: {
      id: 'motorcycle-1',
      licensePlate: '1234567'
    }
  };

  const mockMileageReport = {
    id: 'mileage-1',
    courierId: 'courier-1',
    mileage: 15000,
    reportedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      client: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      motorcycle: {
        findMany: jest.fn(),
      },
      mileageReport: {
        findMany: jest.fn(),
      },
      maintenanceHistory: {
        findMany: jest.fn(),
      },
    } as any;

    // Set default mock behaviors
    mockPrismaService.client.create.mockReturnValue(Promise.resolve(mockClient));
    mockPrismaService.client.update.mockReturnValue(Promise.resolve(mockClient));
    mockPrismaService.client.findUnique.mockImplementation((args: any) => {
      if (args.where.id === 'non-existent') {
        return Promise.resolve(null);
      }
      return Promise.resolve(mockClient);
    });
    mockPrismaService.client.findMany.mockReturnValue(Promise.resolve([mockClient]));
    mockPrismaService.client.count.mockReturnValue(Promise.resolve(1));
    mockPrismaService.client.delete.mockReturnValue(Promise.resolve(mockClient));
    mockPrismaService.motorcycle.findMany.mockReturnValue(Promise.resolve([{
      id: 'motorcycle-1',
      licensePlate: '1234567',
      type: MotorcycleType.MOTORCYCLE_125,
      currentMileage: 10000,
      assignedClientId: 'client-1'
    }]));
    mockPrismaService.mileageReport.findMany.mockReturnValue(Promise.resolve([mockMileageReport]));
    mockPrismaService.maintenanceHistory.findMany.mockReturnValue(Promise.resolve([mockMaintenanceRecord]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClientService>(ClientService);
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
    it('should create a client successfully', async () => {
      const input = { name: 'Client ABC' };


      const result = await service.create(input);

      expect(result).toEqual({
        id: 'client-1',
        name: 'Client ABC',
        isActive: true,
      });
    });
  });

  describe('update', () => {
    it('should update a client successfully', async () => {
      const input = {
        id: 'client-1',
        name: 'Updated Client Name'
      };

      const updatedClient = { ...mockClient, name: 'Updated Client Name' };
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.client.update as any).mockReturnValueOnce(Promise.resolve(updatedClient));

      const result = await service.update(input);

      expect(result.name).toBe('Updated Client Name');
    });

    it('should throw NotFoundException when client does not exist', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      await expect(service.update({
        id: 'non-existent',
        name: 'Updated Name'
      })).rejects.toThrow('לקוח לא נמצא');
    });
  });

  describe('findById', () => {
    it('should return client when found', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));

      const result = await service.findById('client-1');

      expect(result).toEqual({
        id: 'client-1',
        name: 'Client ABC',
        isActive: true,
      });
    });

    it('should return null when client not found', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated clients', async () => {
      (prismaService.client.findMany as any).mockReturnValueOnce(Promise.resolve([mockClient]));
      (prismaService.client.count as any).mockReturnValueOnce(Promise.resolve(1));

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.clients).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by active status', async () => {
      (prismaService.client.findMany as any).mockReturnValueOnce(Promise.resolve([mockClient]));
      (prismaService.client.count as any).mockReturnValueOnce(Promise.resolve(1));

      await service.findAll({ page: 1, limit: 10, isActive: true });

      expect(prismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true })
        })
      );
    });
  });

  describe('findWithFleet', () => {
    it('should return clients with fleet information', async () => {
      const clientWithMotorcycles = {
        ...mockClient,
        motorcycles: [mockMotorcycle]
      };

      (prismaService.client.findMany as any).mockReturnValueOnce(Promise.resolve([clientWithMotorcycles]));
      (prismaService.client.count as any).mockReturnValueOnce(Promise.resolve(1));

      const result = await service.findWithFleet();

      expect(result.clients[0]!.motorcycleCount).toBe(1);
      expect(result.clients[0]!.activeMotorcycleCount).toBe(1);
    });
  });

  describe('getFleetOverview', () => {
    it('should return detailed fleet overview', async () => {
      const motorcycles = [mockMotorcycle];
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.motorcycle.findMany as any).mockReturnValueOnce(Promise.resolve(motorcycles));

      const result = await service.getFleetOverview({
        clientId: 'client-1',
        includeInactive: false
      });

      expect(result.clientId).toBe('client-1');
      expect(result.motorcycles).toHaveLength(1);
      expect(result.summary.totalMotorcycles).toBe(1);
      expect(result.summary.activeMotorcycles).toBe(1);
    });

    it('should throw NotFoundException when client does not exist', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(null));

      await expect(service.getFleetOverview({
        clientId: 'non-existent',
        includeInactive: false
      })).rejects.toThrow('לקוח לא נמצא');
    });

    it('should filter by motorcycle type', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.motorcycle.findMany as any).mockReturnValueOnce(Promise.resolve([mockMotorcycle]));

      await service.getFleetOverview({
        clientId: 'client-1',
        includeInactive: false,
        motorcycleType: '125'
      });

      expect(prismaService.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          assignedClientId: 'client-1',
          isActive: true,
          type: '125'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('getStats', () => {
    it('should return client statistics', async () => {
      const reports = [
        { mileage: 10000 },
        { mileage: 15000 },
      ];

      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.motorcycle.findMany as any).mockReturnValueOnce(Promise.resolve([
        { id: 'm1', licensePlate: '123' },
        { id: 'm2', licensePlate: '456' }
      ]));
      (prismaService.mileageReport.findMany as any).mockReturnValueOnce(Promise.resolve(reports));
      (prismaService.maintenanceHistory.findMany as any).mockReturnValueOnce(Promise.resolve([]));

      const result = await service.getStats({
        clientId: 'client-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      expect(result.clientId).toBe('client-1');
      expect(result.totalMileage).toBe(5000); // 15000 - 10000
      expect(result.maintenanceCount).toBe(0);
      expect(result.motorcycleCount).toBe(2);
    });
  });

  describe('getMaintenanceReport', () => {
    it('should return maintenance report for week period', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.maintenanceHistory.findMany as any).mockReturnValueOnce(Promise.resolve([mockMaintenanceRecord]));

      const result = await service.getMaintenanceReport({
        clientId: 'client-1',
        period: 'week'
      });

      expect(result.clientId).toBe('client-1');
      expect(result.period).toBe('week');
      expect(result.maintenanceRecords).toHaveLength(1);
      expect(result.totalMaintenanceCount).toBe(1);
    });

    it('should throw ConflictException for invalid period', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));

      await expect(service.getMaintenanceReport({
        clientId: 'client-1',
        period: 'invalid' as any
      })).rejects.toThrow('תקופה לא חוקית');
    });

    it('should filter by maintenance type', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.maintenanceHistory.findMany as any).mockReturnValueOnce(Promise.resolve([]));

      await service.getMaintenanceReport({
        clientId: 'client-1',
        period: 'month',
        maintenanceType: 'SMALL'
      });

      expect(prismaService.maintenanceHistory.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          maintenanceType: 'SMALL'
        }),
        include: expect.any(Object),
        orderBy: { performedAt: 'desc' }
      });
    });
  });

  describe('bulkOperation', () => {
    it('should perform bulk activate operation', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.client.update as any).mockReturnValueOnce(Promise.resolve({ ...mockClient, isActive: true }));

      const result = await service.bulkOperation({
        clientIds: ['client-1', 'client-2'],
        operation: 'activate'
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should handle partial failures in bulk operation', async () => {
      // First call succeeds, second fails
      (prismaService.client.findUnique as any)
        .mockReturnValueOnce(Promise.resolve(mockClient))
        .mockReturnValueOnce(Promise.resolve(null));

      (prismaService.client.update as any).mockReturnValueOnce(Promise.resolve(mockClient));

      const result = await service.bulkOperation({
        clientIds: ['client-1', 'client-2'],
        operation: 'activate'
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle invalid operation in bulk operation', async () => {
      const result = await service.bulkOperation({
        clientIds: ['client-1'],
        operation: 'invalid' as any
      });

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors[0]!.error).toBe('פעולה לא חוקית');
    });
  });

  describe('deactivate', () => {
    it('should deactivate client', async () => {
      const inactiveClient = { ...mockClient, isActive: false };
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));
      (prismaService.client.update as any).mockReturnValueOnce(Promise.resolve(inactiveClient));

      const result = await service.deactivate('client-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('activate', () => {
    it('should activate client', async () => {
      const inactiveClient = { ...mockClient, isActive: false };
      const activeClient = { ...mockClient, isActive: true };
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(inactiveClient));
      (prismaService.client.update as any).mockReturnValueOnce(Promise.resolve(activeClient));

      const result = await service.activate('client-1');

      expect(result.isActive).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete client', async () => {
      (prismaService.client.findUnique as any).mockReturnValueOnce(Promise.resolve(mockClient));

      await expect(service.delete('client-1')).resolves.not.toThrow();

      expect(prismaService.client.delete).toHaveBeenCalledWith({
        where: { id: 'client-1' }
      });
    });
  });

  describe('getClientsWithExpiringItems', () => {
    it('should return clients with expiring licenses or insurance', async () => {
      const clientWithExpiringItems = {
        ...mockClient,
        motorcycles: [{
          ...mockMotorcycle,
          licenseExpiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        }]
      };

      (prismaService.client.findMany as any).mockReturnValueOnce(Promise.resolve([clientWithExpiringItems]));

      const result = await service.getClientsWithExpiringItems(30);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('client-1');
    });
  });

  describe('getHighMaintenanceClients', () => {
    it('should return clients with high maintenance frequency', async () => {
      const clientWithHighMaintenance = {
        ...mockClient,
        motorcycles: [
          {
            id: 'm1',
            maintenanceHistory: [
              { performedAt: new Date() },
              { performedAt: new Date() },
              { performedAt: new Date() },
              { performedAt: new Date() },
              { performedAt: new Date() },
              { performedAt: new Date() }, // 6 maintenance records
            ]
          }
        ]
      };

      (prismaService.client.findMany as any).mockReturnValueOnce(Promise.resolve([clientWithHighMaintenance]));

      const result = await service.getHighMaintenanceClients(5);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('client-1');
    });
  });
});
