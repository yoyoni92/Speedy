import { ClientInfo, CreateClientInput, UpdateClientInput } from '../../../types/domain.types';
import { ClientQueryInput, ClientStatsInput, ClientFleetInput, ClientMaintenanceReportInput, BulkClientOperationInput } from '../../../common/schemas/client.schema';

/**
 * Interface for client service operations
 */
export interface IClientService {
  /**
   * Create a new client
   */
  create(input: CreateClientInput): Promise<ClientInfo>;

  /**
   * Update an existing client
   */
  update(input: UpdateClientInput): Promise<ClientInfo>;

  /**
   * Find client by ID
   */
  findById(id: string): Promise<ClientInfo | null>;

  /**
   * Get all clients with optional filtering and pagination
   */
  findAll(query?: ClientQueryInput): Promise<{
    clients: ClientInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Get clients with their fleet information
   */
  findWithFleet(query?: ClientQueryInput): Promise<{
    clients: (ClientInfo & { motorcycles: any[]; motorcycleCount: number; activeMotorcycleCount: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Get detailed fleet overview for a client
   */
  getFleetOverview(input: ClientFleetInput): Promise<any>;

  /**
   * Get client statistics
   */
  getStats(input: ClientStatsInput): Promise<any>;

  /**
   * Get maintenance report for a client
   */
  getMaintenanceReport(input: ClientMaintenanceReportInput): Promise<any>;

  /**
   * Perform bulk operations on multiple clients
   */
  bulkOperation(input: BulkClientOperationInput): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ clientId: string; error: string }>;
  }>;

  /**
   * Deactivate a client
   */
  deactivate(id: string): Promise<ClientInfo>;

  /**
   * Reactivate a client
   */
  activate(id: string): Promise<ClientInfo>;

  /**
   * Delete a client permanently
   */
  delete(id: string): Promise<void>;

  /**
   * Get clients with expiring licenses/insurance
   */
  getClientsWithExpiringItems(daysAhead?: number): Promise<ClientInfo[]>;

  /**
   * Get clients with high maintenance costs
   */
  getHighMaintenanceClients(threshold?: number): Promise<ClientInfo[]>;
}
