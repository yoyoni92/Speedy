import { MotorcycleInfo, CreateMotorcycleInput, UpdateMotorcycleInput } from '../../../types/domain.types';
import { MotorcycleQueryInput, AssignMotorcycleInput, UpdateMileageInput, MaintenanceRecordInput } from '../../../common/schemas/motorcycle.schema';

/**
 * Interface for motorcycle service operations
 */
export interface IMotorcycleService {
  /**
   * Create a new motorcycle
   */
  create(input: CreateMotorcycleInput): Promise<MotorcycleInfo>;

  /**
   * Update an existing motorcycle
   */
  update(input: UpdateMotorcycleInput): Promise<MotorcycleInfo>;

  /**
   * Find motorcycle by ID
   */
  findById(id: string): Promise<MotorcycleInfo | null>;

  /**
   * Find motorcycle by license plate
   */
  findByLicensePlate(licensePlate: string): Promise<MotorcycleInfo | null>;

  /**
   * Get all motorcycles with optional filtering and pagination
   */
  findAll(query?: MotorcycleQueryInput): Promise<{
    motorcycles: MotorcycleInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Get motorcycles assigned to a specific courier
   */
  findByCourierId(courierId: string, includeInactive?: boolean): Promise<MotorcycleInfo[]>;

  /**
   * Get motorcycles assigned to a specific client
   */
  findByClientId(clientId: string, includeInactive?: boolean): Promise<MotorcycleInfo[]>;

  /**
   * Assign motorcycle to courier and/or client
   */
  assign(input: AssignMotorcycleInput): Promise<MotorcycleInfo>;

  /**
   * Unassign motorcycle from courier and/or client
   */
  unassign(motorcycleId: string): Promise<MotorcycleInfo>;

  /**
   * Update motorcycle mileage
   */
  updateMileage(input: UpdateMileageInput): Promise<MotorcycleInfo>;

  /**
   * Record maintenance for a motorcycle
   */
  recordMaintenance(input: MaintenanceRecordInput): Promise<MotorcycleInfo>;

  /**
   * Get maintenance history for a motorcycle
   */
  getMaintenanceHistory(motorcycleId: string, limit?: number): Promise<any[]>;

  /**
   * Deactivate a motorcycle (soft delete)
   */
  deactivate(id: string): Promise<MotorcycleInfo>;

  /**
   * Reactivate a motorcycle
   */
  activate(id: string): Promise<MotorcycleInfo>;

  /**
   * Delete a motorcycle permanently
   */
  delete(id: string): Promise<void>;

  /**
   * Check if license plate is available (not used by active motorcycle)
   */
  isLicensePlateAvailable(licensePlate: string, excludeId?: string): Promise<boolean>;
}
