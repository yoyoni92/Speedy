import {
  CreateMotorcycleDto,
  UpdateMotorcycleDto,
  UpdateMileageDto,
  MotorcycleQueryDto,
  AssignMotorcycleDto,
  MaintenanceRecordDto
} from '../../../common/schemas/motorcycle.schema';
import { MotorcycleInfo } from '../../../types/domain.types';

// Re-export DTOs from schemas for consistency
export {
  CreateMotorcycleDto,
  UpdateMotorcycleDto,
  UpdateMileageDto,
  MotorcycleQueryDto,
  AssignMotorcycleDto,
  MaintenanceRecordDto
} from '../../../common/schemas/motorcycle.schema';

/**
 * Response DTO for motorcycle data
 */
export class MotorcycleResponseDto {
  id: string;
  licensePlate: string;
  type: string;
  currentMileage: number;
  licenseExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceType: string;
  isActive: boolean;
  assignedCourier?: {
    id: string;
    name: string;
  };
  assignedClient?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(motorcycle: MotorcycleInfo) {
    this.id = motorcycle.id;
    this.licensePlate = motorcycle.licensePlate;
    this.type = motorcycle.type;
    this.currentMileage = motorcycle.currentMileage;
    this.licenseExpiryDate = motorcycle.licenseExpiryDate;
    this.insuranceExpiryDate = motorcycle.insuranceExpiryDate;
    this.insuranceType = motorcycle.insuranceType;
    this.isActive = motorcycle.isActive;
    this.assignedCourier = motorcycle.assignedCourier;
    this.assignedClient = motorcycle.assignedClient;
    // Note: createdAt and updatedAt would come from Prisma model, not domain type
  }
}

/**
 * Response DTO for paginated motorcycle list
 */
export class MotorcycleListResponseDto {
  motorcycles: MotorcycleResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Response DTO for motorcycle with maintenance history
 */
export class MotorcycleWithMaintenanceDto extends MotorcycleResponseDto {
  maintenanceHistory: MaintenanceHistoryItemDto[];
  nextMaintenance?: {
    type: string;
    nextMileage: number | null;
    dueIn: number | null;
    intervalKm: number;
    isOverdue?: boolean;
  };
}

/**
 * Maintenance history item DTO
 */
export class MaintenanceHistoryItemDto {
  id: string;
  maintenanceType: string;
  mileageAtMaintenance: number;
  performedAt: Date;
  notes?: string;
}

/**
 * Motorcycle statistics DTO
 */
export class MotorcycleStatsDto {
  totalMotorcycles: number;
  activeMotorcycles: number;
  byType: {
    '125': number;
    '250': number;
    ELECTRIC: number;
  };
  byStatus: {
    assigned: number;
    unassigned: number;
    maintenanceDue: number;
    licenseExpired: number;
    insuranceExpired: number;
  };
}
