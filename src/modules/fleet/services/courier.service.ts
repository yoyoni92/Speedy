import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ICourierService } from '../interfaces/courier.interface';
import {
  CourierInfo,
  CreateCourierInput,
  UpdateCourierInput,
  ReportMileageInput
} from '../../../types/domain.types';
import {
  CourierQueryInput,
  CourierStatsInput,
  PhoneNumberInput,
  CreateUserWithCourierInput,
  CourierPerformanceInput
} from '../../../common/schemas/courier.schema';

@Injectable()
export class CourierService implements ICourierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCourierInput): Promise<CourierInfo> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId }
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    // Check if courier already exists for this user
    const existingCourier = await this.prisma.courier.findUnique({
      where: { userId: input.userId }
    });

    if (existingCourier) {
      throw new ConflictException('שליח כבר קיים עבור משתמש זה');
    }

    const courier = await this.prisma.courier.create({
      data: {
        userId: input.userId,
        name: input.name,
      }
    });

    return this.mapToCourierInfo(courier);
  }

  async createWithUser(input: CreateUserWithCourierInput): Promise<CourierInfo & { userId: string }> {
    // Check if phone number is available
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: input.phoneNumber }
    });

    if (existingUser) {
      throw new ConflictException('מספר טלפון כבר רשום במערכת');
    }

    // Create user and courier in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phoneNumber: input.phoneNumber,
          role: 'COURIER'
        }
      });

      const courier = await tx.courier.create({
        data: {
          userId: user.id,
          name: input.courierName,
        }
      });

      return { user, courier };
    });

    return {
      ...this.mapToCourierInfo(result.courier),
      userId: result.user.id
    };
  }

  async update(input: UpdateCourierInput): Promise<CourierInfo> {
    const { id, ...updateData } = input;

    const existing = await this.prisma.courier.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException('שליח לא נמצא');
    }

    const courier = await this.prisma.courier.update({
      where: { id },
      data: updateData
    });

    return this.mapToCourierInfo(courier);
  }

  async findById(id: string): Promise<CourierInfo | null> {
    const courier = await this.prisma.courier.findUnique({
      where: { id }
    });

    return courier ? this.mapToCourierInfo(courier) : null;
  }

  async findByUserId(userId: string): Promise<CourierInfo | null> {
    const courier = await this.prisma.courier.findUnique({
      where: { userId }
    });

    return courier ? this.mapToCourierInfo(courier) : null;
  }

  async findAll(query: CourierQueryInput = { page: 1, limit: 10 }): Promise<{
    couriers: CourierInfo[];
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

    const [couriers, total] = await Promise.all([
      this.prisma.courier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.courier.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      couriers: couriers.map(c => this.mapToCourierInfo(c)),
      total,
      page,
      limit,
      totalPages
    };
  }

  async findWithMotorcycles(query: CourierQueryInput = { page: 1, limit: 10 }): Promise<{
    couriers: (CourierInfo & { motorcycles: any[]; motorcycleCount: number })[];
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

    const [couriers, total] = await Promise.all([
      this.prisma.courier.findMany({
        where,
        include: {
          motorcycles: {
            where: { isActive: true },
            select: {
              id: true,
              licensePlate: true,
              type: true,
              currentMileage: true,
              isActive: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.courier.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    const couriersWithCounts = couriers.map(c => ({
      ...this.mapToCourierInfo(c),
      motorcycles: c.motorcycles,
      motorcycleCount: c.motorcycles.length
    }));

    return {
      couriers: couriersWithCounts,
      total,
      page,
      limit,
      totalPages
    };
  }

  async reportMileage(input: ReportMileageInput): Promise<void> {
    const { motorcycleId, mileage, courierId } = input;

    // Validate courier exists
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
    }

    // Validate motorcycle exists and is assigned to this courier
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    if (motorcycle.assignedCourierId !== courierId) {
      throw new ConflictException('אופנוע לא מוקצה לשליח זה');
    }

    // Check if new mileage is higher than current
    if (mileage < motorcycle.currentMileage) {
      throw new ConflictException('הקילומטראז החדש לא יכול להיות נמוך מהקילומטראז הנוכחי');
    }

    // Create mileage report and update motorcycle mileage in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.mileageReport.create({
        data: {
          motorcycleId,
          courierId,
          mileage
        }
      });

      await tx.motorcycle.update({
        where: { id: motorcycleId },
        data: { currentMileage: mileage }
      });
    });
  }

  async getMileageReports(courierId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
    }

    const where: any = { courierId };

    if (startDate) {
      where.reportedAt = { gte: startDate };
    }

    if (endDate) {
      where.reportedAt = { ...where.reportedAt, lte: endDate };
    }

    return this.prisma.mileageReport.findMany({
      where,
      include: {
        motorcycle: {
          select: {
            id: true,
            licensePlate: true,
            type: true
          }
        }
      },
      orderBy: { reportedAt: 'desc' }
    });
  }

  async getStats(input: CourierStatsInput): Promise<any> {
    const { courierId, startDate, endDate } = input;

    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
    }

    const reports = await this.prisma.mileageReport.findMany({
      where: {
        courierId,
        reportedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { reportedAt: 'asc' }
    });

    const totalMileage = reports.length > 0 ?
      Math.max(...reports.map(r => r.mileage)) - Math.min(...reports.map(r => r.mileage)) : 0;

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyMileage = daysDiff > 0 ? totalMileage / daysDiff : 0;

    const motorcycleIds = [...new Set(reports.map(r => r.motorcycleId))];

    return {
      courierId,
      period: { startDate, endDate },
      totalMileage,
      averageDailyMileage,
      totalReports: reports.length,
      motorcycleCount: motorcycleIds.length
    };
  }

  async getPerformance(input: CourierPerformanceInput): Promise<any> {
    const { courierId, period, year, month } = input;

    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
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

    const reports = await this.prisma.mileageReport.findMany({
      where: {
        courierId,
        reportedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalMileage = reports.length > 0 ?
      Math.max(...reports.map(r => r.mileage)) - Math.min(...reports.map(r => r.mileage)) : 0;

    const motorcycleIds = [...new Set(reports.map(r => r.motorcycleId))];

    return {
      courierId,
      period,
      year,
      month,
      totalMileage,
      averageMileage: motorcycleIds.length > 0 ? totalMileage / motorcycleIds.length : 0,
      motorcycleUtilization: motorcycleIds.length,
      reportsCount: reports.length
    };
  }

  async deactivate(id: string): Promise<CourierInfo> {
    const courier = await this.prisma.courier.findUnique({
      where: { id }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
    }

    const updated = await this.prisma.courier.update({
      where: { id },
      data: { isActive: false }
    });

    return this.mapToCourierInfo(updated);
  }

  async activate(id: string): Promise<CourierInfo> {
    const courier = await this.prisma.courier.findUnique({
      where: { id }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
    }

    const updated = await this.prisma.courier.update({
      where: { id },
      data: { isActive: true }
    });

    return this.mapToCourierInfo(updated);
  }

  async delete(id: string): Promise<void> {
    const courier = await this.prisma.courier.findUnique({
      where: { id }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
    }

    await this.prisma.courier.delete({
      where: { id }
    });
  }

  async isPhoneNumberAvailable(phoneNumber: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber }
    });

    return !user;
  }

  async getUnderutilizedCouriers(threshold = 5): Promise<CourierInfo[]> {
    // Find couriers with fewer than threshold motorcycles
    const couriers = await this.prisma.courier.findMany({
      where: {
        isActive: true
      },
      include: {
        _count: {
          select: { motorcycles: true }
        }
      }
    });

    const underutilized = couriers.filter(c => c._count.motorcycles < threshold);

    return underutilized.map(c => this.mapToCourierInfo(c));
  }

  private mapToCourierInfo(courier: any): CourierInfo {
    return {
      id: courier.id,
      name: courier.name,
      isActive: courier.isActive,
    };
  }
}
