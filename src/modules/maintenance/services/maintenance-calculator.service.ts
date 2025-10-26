import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { MaintenanceType, MotorcycleType } from '@prisma/client';
import { IMaintenanceCalculator, MaintenanceCalculationResult, MaintenanceHistory } from '../interfaces/calculator.interface';

interface CalculationInput {
  motorcycleId?: string;
  type: MotorcycleType;
  currentMileage: number;
  maintenanceHistory?: MaintenanceHistory[];
}

@Injectable()
export class MaintenanceCalculatorService implements IMaintenanceCalculator {
  private readonly logger = new Logger(MaintenanceCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  async calculateNext(input: CalculationInput): Promise<MaintenanceCalculationResult> {
    const { type, currentMileage, motorcycleId } = input;

    // Get maintenance history if not provided
    let history = input.maintenanceHistory;
    if (!history && motorcycleId) {
      const records = await this.prisma.maintenanceHistory.findMany({
        where: { motorcycleId },
        orderBy: { mileageAtMaintenance: 'asc' },
        select: {
          maintenanceType: true,
          mileageAtMaintenance: true,
        },
      });
      history = records;
    }

    switch (type) {
      case MotorcycleType.MOTORCYCLE_125:
        return this.calculate125Cycle(currentMileage, history || []);
      
      case MotorcycleType.MOTORCYCLE_250:
        return this.calculate250Cycle(currentMileage, history || []);
      
      case MotorcycleType.ELECTRIC:
        return {
          type: MaintenanceType.NONE,
          nextMileage: null,
          dueIn: null,
          intervalKm: 0,
          cyclePosition: 0,
        };
      
      default:
        throw new Error(`Unknown motorcycle type: ${type}`);
    }
  }

  private calculate125Cycle(
    currentMileage: number,
    history: MaintenanceHistory[]
  ): MaintenanceCalculationResult {
    const INTERVAL = 4000;
    
    // Filter out NONE maintenance types and sort by mileage
    const validHistory = history
      .filter(h => h.maintenanceType !== MaintenanceType.NONE)
      .sort((a, b) => a.mileageAtMaintenance - b.mileageAtMaintenance);

    // Determine cycle position (0-based)
    // For 125cc: Small (0), Large (1), repeat
    const cyclePosition = validHistory.length % 2;
    
    // Pattern: Small (0), Large (1), repeat
    // 4000km Small -> 8000km Large -> 12000km Small -> 16000km Large
    const nextType = cyclePosition === 0 ? MaintenanceType.SMALL : MaintenanceType.LARGE;
    
    // Calculate next milestone
    const nextMileage = Math.ceil(currentMileage / INTERVAL) * INTERVAL;
    const adjustedNextMileage = nextMileage <= currentMileage ? nextMileage + INTERVAL : nextMileage;
    
    return {
      type: nextType,
      nextMileage: adjustedNextMileage,
      dueIn: adjustedNextMileage - currentMileage,
      intervalKm: INTERVAL,
      cyclePosition,
    };
  }

  private calculate250Cycle(
    currentMileage: number,
    history: MaintenanceHistory[]
  ): MaintenanceCalculationResult {
    const INTERVAL = 5000;
    
    // Filter out NONE maintenance types and sort by mileage
    const validHistory = history
      .filter(h => h.maintenanceType !== MaintenanceType.NONE)
      .sort((a, b) => a.mileageAtMaintenance - b.mileageAtMaintenance);

    // Determine cycle position (0-based)
    // For 250cc: Small (0), Small (1), Large (2), repeat
    const cyclePosition = validHistory.length % 3;
    
    // Pattern: Small (0), Small (1), Large (2), repeat
    // 5000km Small -> 10000km Small -> 15000km Large -> 20000km Small
    const nextType = cyclePosition === 2 ? MaintenanceType.LARGE : MaintenanceType.SMALL;
    
    // Calculate next milestone
    const nextMileage = Math.ceil(currentMileage / INTERVAL) * INTERVAL;
    const adjustedNextMileage = nextMileage <= currentMileage ? nextMileage + INTERVAL : nextMileage;
    
    return {
      type: nextType,
      nextMileage: adjustedNextMileage,
      dueIn: adjustedNextMileage - currentMileage,
      intervalKm: INTERVAL,
      cyclePosition,
    };
  }
}
