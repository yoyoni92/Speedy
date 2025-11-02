import { CourierInfo, CreateCourierInput, UpdateCourierInput, ReportMileageInput } from '../../../types/domain.types';
import { CourierQueryInput, CourierStatsInput, PhoneNumberInput, CreateUserWithCourierInput, CourierPerformanceInput } from '../../../common/schemas/courier.schema';

/**
 * Interface for courier service operations
 */
export interface ICourierService {
  /**
   * Create a new courier
   */
  create(input: CreateCourierInput): Promise<CourierInfo>;

  /**
   * Create a new user with courier profile
   */
  createWithUser(input: CreateUserWithCourierInput): Promise<CourierInfo & { userId: string }>;

  /**
   * Update an existing courier
   */
  update(input: UpdateCourierInput): Promise<CourierInfo>;

  /**
   * Find courier by ID
   */
  findById(id: string): Promise<CourierInfo | null>;

  /**
   * Find courier by user ID
   */
  findByUserId(userId: string): Promise<CourierInfo | null>;

  /**
   * Get all couriers with optional filtering and pagination
   */
  findAll(query?: CourierQueryInput): Promise<{
    couriers: CourierInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Get couriers with their assigned motorcycles
   */
  findWithMotorcycles(query?: CourierQueryInput): Promise<{
    couriers: (CourierInfo & { motorcycles: any[]; motorcycleCount: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Report mileage for a motorcycle
   */
  reportMileage(input: ReportMileageInput): Promise<void>;

  /**
   * Get mileage reports for a courier
   */
  getMileageReports(courierId: string, startDate?: Date, endDate?: Date): Promise<any[]>;

  /**
   * Get courier statistics
   */
  getStats(input: CourierStatsInput): Promise<any>;

  /**
   * Get courier performance metrics
   */
  getPerformance(input: CourierPerformanceInput): Promise<any>;

  /**
   * Deactivate a courier
   */
  deactivate(id: string): Promise<CourierInfo>;

  /**
   * Reactivate a courier
   */
  activate(id: string): Promise<CourierInfo>;

  /**
   * Delete a courier permanently
   */
  delete(id: string): Promise<void>;

  /**
   * Check if phone number is available for new user
   */
  isPhoneNumberAvailable(phoneNumber: string): Promise<boolean>;

  /**
   * Get couriers with low motorcycle utilization
   */
  getUnderutilizedCouriers(threshold?: number): Promise<CourierInfo[]>;
}
