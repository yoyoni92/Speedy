import { MaintenanceType, MotorcycleType } from '@prisma/client';

export interface MaintenanceHistory {
  maintenanceType: MaintenanceType;
  mileageAtMaintenance: number;
}

export interface MaintenanceCalculationResult {
  type: MaintenanceType;
  nextMileage: number | null;
  dueIn: number | null;
  intervalKm: number;
  cyclePosition: number;
}

export interface IMaintenanceCalculator {
  calculateNext(input: {
    motorcycleId?: string;
    type: MotorcycleType;
    currentMileage: number;
    maintenanceHistory?: MaintenanceHistory[];
  }): Promise<MaintenanceCalculationResult>;
}
