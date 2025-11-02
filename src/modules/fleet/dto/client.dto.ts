import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
  ClientStatsDto,
  ClientFleetDto,
  ClientMaintenanceReportDto,
  BulkClientOperationDto,
  ClientContactDto
} from '../../../common/schemas/client.schema';
import { ClientInfo } from '../../../types/domain.types';

// Re-export DTOs from schemas for consistency
export {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
  ClientStatsDto,
  ClientFleetDto,
  ClientMaintenanceReportDto,
  BulkClientOperationDto,
  ClientContactDto
} from '../../../common/schemas/client.schema';

/**
 * Response DTO for client data
 */
export class ClientResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(client: ClientInfo & { createdAt: Date; updatedAt: Date }) {
    this.id = client.id;
    this.name = client.name;
    this.isActive = client.isActive;
    this.createdAt = client.createdAt;
    this.updatedAt = client.updatedAt;
  }
}

/**
 * Response DTO for paginated client list
 */
export class ClientListResponseDto {
  clients: ClientResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Response DTO for client with fleet information
 */
export class ClientWithFleetDto extends ClientResponseDto {
  motorcycles: {
    id: string;
    licensePlate: string;
    type: string;
    currentMileage: number;
    isActive: boolean;
    assignedCourier?: {
      id: string;
      name: string;
    };
  }[];
  motorcycleCount: number;
  activeMotorcycleCount: number;
}

/**
 * Client statistics response DTO
 */
export class ClientStatsResponseDto {
  clientId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  totalMileage: number;
  averageMileagePerMotorcycle: number;
  maintenanceCount: number;
  motorcycleCount: number;
}

/**
 * Client maintenance report response DTO
 */
export class ClientMaintenanceReportResponseDto {
  clientId: string;
  period: string;
  year?: number;
  month?: number;
  maintenanceType?: string;
  maintenanceRecords: Array<{
    motorcycleId: string;
    licensePlate: string;
    maintenanceType: string;
    mileageAtMaintenance: number;
    performedAt: Date;
    notes?: string;
  }>;
  totalMaintenanceCount: number;
  maintenanceByType: Record<string, number>;
}

/**
 * Client fleet overview response DTO
 */
export class ClientFleetOverviewDto {
  clientId: string;
  includeInactive: boolean;
  motorcycleType?: string;
  motorcycles: Array<{
    id: string;
    licensePlate: string;
    type: string;
    currentMileage: number;
    isActive: boolean;
    licenseExpiryDate: Date;
    insuranceExpiryDate: Date;
    assignedCourier?: {
      id: string;
      name: string;
    };
  }>;
  summary: {
    totalMotorcycles: number;
    activeMotorcycles: number;
    byType: Record<string, number>;
    expiringLicenses: number;
    expiringInsurance: number;
  };
}

/**
 * Bulk client operation response DTO
 */
export class BulkClientOperationResponseDto {
  operation: string;
  clientIds: string[];
  successCount: number;
  failureCount: number;
  errors: Array<{
    clientId: string;
    error: string;
  }>;
}
