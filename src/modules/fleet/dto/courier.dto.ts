import {
  CreateCourierDto,
  UpdateCourierDto,
  CourierQueryDto,
  CourierStatsDto,
  PhoneNumberDto,
  CreateUserWithCourierDto,
  MileageReportDto,
  CourierPerformanceDto
} from '../../../common/schemas/courier.schema';
import { CourierInfo } from '../../../types/domain.types';

// Re-export DTOs from schemas for consistency
export {
  CreateCourierDto,
  UpdateCourierDto,
  CourierQueryDto,
  CourierStatsDto,
  PhoneNumberDto,
  CreateUserWithCourierDto,
  MileageReportDto,
  CourierPerformanceDto
} from '../../../common/schemas/courier.schema';

/**
 * Response DTO for courier data
 */
export class CourierResponseDto {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(courier: CourierInfo & { userId: string; createdAt: Date; updatedAt: Date }) {
    this.id = courier.id;
    this.userId = courier.userId;
    this.name = courier.name;
    this.isActive = courier.isActive;
    this.createdAt = courier.createdAt;
    this.updatedAt = courier.updatedAt;
  }
}

/**
 * Response DTO for paginated courier list
 */
export class CourierListResponseDto {
  couriers: CourierResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Response DTO for courier with motorcycles
 */
export class CourierWithMotorcyclesDto extends CourierResponseDto {
  motorcycles: {
    id: string;
    licensePlate: string;
    type: string;
    currentMileage: number;
    isActive: boolean;
  }[];
  motorcycleCount: number;
}

/**
 * Courier statistics response DTO
 */
export class CourierStatsResponseDto {
  courierId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  totalMileage: number;
  averageDailyMileage: number;
  totalReports: number;
  motorcycleCount: number;
}

/**
 * Courier performance response DTO
 */
export class CourierPerformanceResponseDto {
  courierId: string;
  period: string;
  year?: number;
  month?: number;
  totalMileage: number;
  averageMileage: number;
  motorcycleUtilization: number;
  reportsCount: number;
  rank: number; // Performance ranking
}

/**
 * Bulk courier operation response DTO
 */
export class BulkCourierOperationResponseDto {
  operation: string;
  successCount: number;
  failureCount: number;
  errors: Array<{
    courierId: string;
    error: string;
  }>;
}
