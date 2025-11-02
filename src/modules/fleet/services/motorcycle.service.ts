import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IMotorcycleService } from '../interfaces/motorcycle.interface';
import {
  MotorcycleInfo,
  CreateMotorcycleInput,
  UpdateMotorcycleInput,
  ErrorCodes
} from '../../../types/domain.types';
import {
  MotorcycleQueryInput,
  AssignMotorcycleInput,
  UpdateMileageInput,
  MaintenanceRecordInput
} from '../../../common/schemas/motorcycle.schema';

@Injectable()
export class MotorcycleService implements IMotorcycleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMotorcycleInput): Promise<MotorcycleInfo> {
    // Check if license plate is available
    const existing = await this.prisma.motorcycle.findUnique({
      where: { licensePlate: input.licensePlate }
    });

    if (existing) {
      throw new ConflictException('מספר רישיון כבר קיים במערכת');
    }

    // Validate foreign keys if provided
    if (input.assignedCourierId) {
      await this.validateCourierExists(input.assignedCourierId);
    }

    if (input.assignedClientId) {
      await this.validateClientExists(input.assignedClientId);
    }

    const motorcycle = await this.prisma.motorcycle.create({
      data: {
        licensePlate: input.licensePlate,
        type: input.type,
        currentMileage: input.currentMileage,
        licenseExpiryDate: input.licenseExpiryDate,
        insuranceExpiryDate: input.insuranceExpiryDate,
        insuranceType: input.insuranceType,
        ...(input.assignedCourierId && { assignedCourierId: input.assignedCourierId }),
        ...(input.assignedClientId && { assignedClientId: input.assignedClientId }),
      },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return this.mapToMotorcycleInfo(motorcycle);
  }

  async update(input: UpdateMotorcycleInput): Promise<MotorcycleInfo> {
    const { id, ...updateData } = input;

    // Check if motorcycle exists
    const existing = await this.prisma.motorcycle.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    // Check license plate uniqueness if being updated
    if (updateData.licensePlate && updateData.licensePlate !== existing.licensePlate) {
      const licenseExists = await this.prisma.motorcycle.findUnique({
        where: { licensePlate: updateData.licensePlate }
      });

      if (licenseExists) {
        throw new ConflictException('מספר רישיון כבר קיים במערכת');
      }
    }

    // Validate foreign keys if provided
    if (updateData.assignedCourierId) {
      await this.validateCourierExists(updateData.assignedCourierId);
    }

    if (updateData.assignedClientId) {
      await this.validateClientExists(updateData.assignedClientId);
    }

    const motorcycle = await this.prisma.motorcycle.update({
      where: { id },
      data: updateData,
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return this.mapToMotorcycleInfo(motorcycle);
  }

  async findById(id: string): Promise<MotorcycleInfo | null> {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return motorcycle ? this.mapToMotorcycleInfo(motorcycle) : null;
  }

  async findByLicensePlate(licensePlate: string): Promise<MotorcycleInfo | null> {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { licensePlate },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return motorcycle ? this.mapToMotorcycleInfo(motorcycle) : null;
  }

  async findAll(query: MotorcycleQueryInput = { page: 1, limit: 10 }): Promise<{
    motorcycles: MotorcycleInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      licensePlate,
      type,
      courierId,
      clientId,
      isActive
    } = query;

    const where: any = {};

    if (licensePlate) {
      where.licensePlate = { contains: licensePlate };
    }

    if (type) {
      where.type = type;
    }

    if (courierId) {
      where.assignedCourierId = courierId;
    }

    if (clientId) {
      where.assignedClientId = clientId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [motorcycles, total] = await Promise.all([
      this.prisma.motorcycle.findMany({
        where,
        include: {
          assignedCourier: {
            select: { id: true, name: true }
          },
          assignedClient: {
            select: { id: true, name: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.motorcycle.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      motorcycles: motorcycles.map(m => this.mapToMotorcycleInfo(m)),
      total,
      page,
      limit,
      totalPages
    };
  }

  async findByCourierId(courierId: string, includeInactive = false): Promise<MotorcycleInfo[]> {
    await this.validateCourierExists(courierId);

    const motorcycles = await this.prisma.motorcycle.findMany({
      where: {
        assignedCourierId: courierId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return motorcycles.map(m => this.mapToMotorcycleInfo(m));
  }

  async findByClientId(clientId: string, includeInactive = false): Promise<MotorcycleInfo[]> {
    await this.validateClientExists(clientId);

    const motorcycles = await this.prisma.motorcycle.findMany({
      where: {
        assignedClientId: clientId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return motorcycles.map(m => this.mapToMotorcycleInfo(m));
  }

  async assign(input: AssignMotorcycleInput): Promise<MotorcycleInfo> {
    const { motorcycleId, courierId, clientId } = input;

    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    // Validate foreign keys if provided
    if (courierId) {
      await this.validateCourierExists(courierId);
    }

    if (clientId) {
      await this.validateClientExists(clientId);
    }

    const updated = await this.prisma.motorcycle.update({
      where: { id: motorcycleId },
      data: {
        ...(courierId !== undefined && { assignedCourierId: courierId }),
        ...(clientId !== undefined && { assignedClientId: clientId }),
      },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return this.mapToMotorcycleInfo(updated);
  }

  async unassign(motorcycleId: string): Promise<MotorcycleInfo> {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    const updated = await this.prisma.motorcycle.update({
      where: { id: motorcycleId },
      data: {
        assignedCourierId: null,
        assignedClientId: null,
      },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return this.mapToMotorcycleInfo(updated);
  }

  async updateMileage(input: UpdateMileageInput): Promise<MotorcycleInfo> {
    const { motorcycleId, mileage } = input;

    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    if (mileage < motorcycle.currentMileage) {
      throw new BadRequestException('הקילומטראז החדש לא יכול להיות נמוך מהקילומטראז הנוכחי');
    }

    const updated = await this.prisma.motorcycle.update({
      where: { id: motorcycleId },
      data: { currentMileage: mileage },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return this.mapToMotorcycleInfo(updated);
  }

  async recordMaintenance(input: MaintenanceRecordInput): Promise<MotorcycleInfo> {
    const { motorcycleId, maintenanceType, mileageAtMaintenance, notes } = input;

    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    // Record maintenance
    await this.prisma.maintenanceHistory.create({
      data: {
        motorcycleId,
        maintenanceType,
        mileageAtMaintenance,
        ...(notes && { notes }),
      }
    });

    // Update current mileage if provided
    if (mileageAtMaintenance > motorcycle.currentMileage) {
      await this.prisma.motorcycle.update({
        where: { id: motorcycleId },
        data: { currentMileage: mileageAtMaintenance }
      });
    }

    // Return updated motorcycle
    return this.findById(motorcycleId) as Promise<MotorcycleInfo>;
  }

  async getMaintenanceHistory(motorcycleId: string, limit = 10): Promise<any[]> {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: motorcycleId }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    return this.prisma.maintenanceHistory.findMany({
      where: { motorcycleId },
      orderBy: { performedAt: 'desc' },
      take: limit
    });
  }

  async deactivate(id: string): Promise<MotorcycleInfo> {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    const updated = await this.prisma.motorcycle.update({
      where: { id },
      data: { isActive: false },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return this.mapToMotorcycleInfo(updated);
  }

  async activate(id: string): Promise<MotorcycleInfo> {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    const updated = await this.prisma.motorcycle.update({
      where: { id },
      data: { isActive: true },
      include: {
        assignedCourier: {
          select: { id: true, name: true }
        },
        assignedClient: {
          select: { id: true, name: true }
        }
      }
    });

    return this.mapToMotorcycleInfo(updated);
  }

  async delete(id: string): Promise<void> {
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id }
    });

    if (!motorcycle) {
      throw new NotFoundException('אופנוע לא נמצא');
    }

    await this.prisma.motorcycle.delete({
      where: { id }
    });
  }

  async isLicensePlateAvailable(licensePlate: string, excludeId?: string): Promise<boolean> {
    const motorcycle = await this.prisma.motorcycle.findFirst({
      where: {
        licensePlate,
        ...(excludeId && { id: { not: excludeId } })
      }
    });

    return !motorcycle;
  }

  private async validateCourierExists(courierId: string): Promise<void> {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId }
    });

    if (!courier) {
      throw new NotFoundException('שליח לא נמצא');
    }
  }

  private async validateClientExists(clientId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException('לקוח לא נמצא');
    }
  }

  private mapToMotorcycleInfo(motorcycle: any): MotorcycleInfo {
    return {
      id: motorcycle.id,
      licensePlate: motorcycle.licensePlate,
      type: motorcycle.type,
      currentMileage: motorcycle.currentMileage,
      licenseExpiryDate: motorcycle.licenseExpiryDate,
      insuranceExpiryDate: motorcycle.insuranceExpiryDate,
      insuranceType: motorcycle.insuranceType,
      isActive: motorcycle.isActive,
      assignedCourier: motorcycle.assignedCourier,
      assignedClient: motorcycle.assignedClient,
    };
  }
}
