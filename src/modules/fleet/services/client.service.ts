import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IClientService } from '../interfaces/client.interface';
import {
  ClientInfo,
  CreateClientInput,
  UpdateClientInput
} from '../../../types/domain.types';
import {
  ClientQueryInput,
  ClientStatsInput,
  ClientFleetInput,
  ClientMaintenanceReportInput,
  BulkClientOperationInput
} from '../../../common/schemas/client.schema';

@Injectable()
export class ClientService implements IClientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateClientInput): Promise<ClientInfo> {
    const client = await this.prisma.client.create({
      data: {
        name: input.name,
      }
    });

    return this.mapToClientInfo(client);
  }

  async update(input: UpdateClientInput): Promise<ClientInfo> {
    const { id, ...updateData } = input;

    const existing = await this.prisma.client.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException('לקוח לא נמצא');
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: updateData
    });

    return this.mapToClientInfo(client);
  }

  async findById(id: string): Promise<ClientInfo | null> {
    const client = await this.prisma.client.findUnique({
      where: { id }
    });

    return client ? this.mapToClientInfo(client) : null;
  }

  async findAll(query: ClientQueryInput = { page: 1, limit: 10 }): Promise<{
    clients: ClientInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      name,
      isActive,
      hasMotorcycles
    } = query;

    const where: any = {};

    if (name) {
      where.name = { contains: name };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (hasMotorcycles !== undefined) {
      where.motorcycles = {
        ...(hasMotorcycles ? { some: {} } : { none: {} })
      };
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.client.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      clients: clients.map(c => this.mapToClientInfo(c)),
      total,
      page,
      limit,
      totalPages
    };
  }

  async findWithFleet(query: ClientQueryInput = { page: 1, limit: 10 }): Promise<{
    clients: (ClientInfo & { motorcycles: any[]; motorcycleCount: number; activeMotorcycleCount: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      name,
      isActive,
      hasMotorcycles
    } = query;

    const where: any = {};

    if (name) {
      where.name = { contains: name };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (hasMotorcycles !== undefined) {
      where.motorcycles = {
        ...(hasMotorcycles ? { some: {} } : { none: {} })
      };
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          motorcycles: {
            select: {
              id: true,
              licensePlate: true,
              type: true,
              currentMileage: true,
              isActive: true,
              assignedCourier: {
                select: { id: true, name: true }
              }
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.client.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    const clientsWithCounts = clients.map(c => ({
      ...this.mapToClientInfo(c),
      motorcycles: c.motorcycles,
      motorcycleCount: c.motorcycles.length,
      activeMotorcycleCount: c.motorcycles.filter(m => m.isActive).length
    }));

    return {
      clients: clientsWithCounts,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getFleetOverview(input: ClientFleetInput): Promise<any> {
    const { clientId, includeInactive, motorcycleType } = input;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException('לקוח לא נמצא');
    }

    const where: any = { assignedClientId: clientId };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (motorcycleType) {
      where.type = motorcycleType;
    }

    const motorcycles = await this.prisma.motorcycle.findMany({
      where,
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const summary = {
      totalMotorcycles: motorcycles.length,
      activeMotorcycles: motorcycles.filter(m => m.isActive).length,
      byType: motorcycles.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      expiringLicenses: motorcycles.filter(m => m.licenseExpiryDate <= thirtyDaysFromNow).length,
      expiringInsurance: motorcycles.filter(m => m.insuranceExpiryDate <= thirtyDaysFromNow).length
    };

    return {
      clientId,
      includeInactive,
      motorcycleType,
      motorcycles,
      summary
    };
  }

  async getStats(input: ClientStatsInput): Promise<any> {
    const { clientId, startDate, endDate } = input;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException('לקוח לא נמצא');
    }

    // Get all motorcycles for this client
    const motorcycles = await this.prisma.motorcycle.findMany({
      where: { assignedClientId: clientId },
      select: { id: true, licensePlate: true }
    });

    const motorcycleIds = motorcycles.map(m => m.id);

    // Get mileage reports for this period
    const reports = await this.prisma.mileageReport.findMany({
      where: {
        motorcycleId: { in: motorcycleIds },
        reportedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { reportedAt: 'asc' }
    });

    // Get maintenance records for this period
    const maintenanceRecords = await this.prisma.maintenanceHistory.findMany({
      where: {
        motorcycleId: { in: motorcycleIds },
        performedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalMileage = reports.length > 0 ?
      Math.max(...reports.map(r => r.mileage)) - Math.min(...reports.map(r => r.mileage)) : 0;

    const averageMileagePerMotorcycle = motorcycles.length > 0 ? totalMileage / motorcycles.length : 0;

    return {
      clientId,
      period: { startDate, endDate },
      totalMileage,
      averageMileagePerMotorcycle,
      maintenanceCount: maintenanceRecords.length,
      motorcycleCount: motorcycles.length
    };
  }

  async getMaintenanceReport(input: ClientMaintenanceReportInput): Promise<any> {
    const { clientId, period, year, month, maintenanceType } = input;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException('לקוח לא נמצא');
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        throw new ConflictException('תקופה לא חוקית');
    }

    const where: any = {
      motorcycle: {
        assignedClientId: clientId
      },
      performedAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (maintenanceType) {
      where.maintenanceType = maintenanceType;
    }

    const maintenanceRecords = await this.prisma.maintenanceHistory.findMany({
      where,
      include: {
        motorcycle: {
          select: {
            id: true,
            licensePlate: true
          }
        }
      },
      orderBy: { performedAt: 'desc' }
    });

    const maintenanceByType = maintenanceRecords.reduce((acc, record) => {
      acc[record.maintenanceType] = (acc[record.maintenanceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      clientId,
      period,
      year,
      month,
      maintenanceType,
      maintenanceRecords,
      totalMaintenanceCount: maintenanceRecords.length,
      maintenanceByType
    };
  }

  async bulkOperation(input: BulkClientOperationInput): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ clientId: string; error: string }>;
  }> {
    const { clientIds, operation } = input;
    const errors: Array<{ clientId: string; error: string }> = [];
    let successCount = 0;

    for (const clientId of clientIds) {
      try {
        switch (operation) {
          case 'activate':
            await this.activate(clientId);
            break;
          case 'deactivate':
            await this.deactivate(clientId);
            break;
          case 'delete':
            await this.delete(clientId);
            break;
          default:
            throw new ConflictException('פעולה לא חוקית');
        }
        successCount++;
      } catch (error) {
        errors.push({
          clientId,
          error: (error instanceof Error ? error.message : 'שגיאה לא ידועה')
        });
      }
    }

    return {
      successCount,
      failureCount: errors.length,
      errors
    };
  }

  async deactivate(id: string): Promise<ClientInfo> {
    const client = await this.prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      throw new NotFoundException('לקוח לא נמצא');
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: { isActive: false }
    });

    return this.mapToClientInfo(updated);
  }

  async activate(id: string): Promise<ClientInfo> {
    const client = await this.prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      throw new NotFoundException('לקוח לא נמצא');
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: { isActive: true }
    });

    return this.mapToClientInfo(updated);
  }

  async delete(id: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      throw new NotFoundException('לקוח לא נמצא');
    }

    await this.prisma.client.delete({
      where: { id }
    });
  }

  async getClientsWithExpiringItems(daysAhead = 30): Promise<ClientInfo[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const clients = await this.prisma.client.findMany({
      where: {
        isActive: true,
        motorcycles: {
          some: {
            OR: [
              { licenseExpiryDate: { lte: futureDate } },
              { insuranceExpiryDate: { lte: futureDate } }
            ]
          }
        }
      }
    });

    return clients.map(c => this.mapToClientInfo(c));
  }

  async getHighMaintenanceClients(threshold = 10): Promise<ClientInfo[]> {
    // Get clients with motorcycles that have high maintenance frequency
    const clients = await this.prisma.client.findMany({
      where: {
        isActive: true
      },
      include: {
        motorcycles: {
          include: {
            maintenanceHistory: {
              where: {
                performedAt: {
                  gte: new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000) // Last year
                }
              }
            }
          }
        }
      }
    });

    const highMaintenanceClients = clients.filter(client => {
      const totalMaintenance = client.motorcycles.reduce(
        (sum, motorcycle) => sum + motorcycle.maintenanceHistory.length,
        0
      );
      return totalMaintenance >= threshold;
    });

    return highMaintenanceClients.map(c => this.mapToClientInfo(c));
  }

  private mapToClientInfo(client: any): ClientInfo {
    return {
      id: client.id,
      name: client.name,
      isActive: client.isActive,
    };
  }
}
