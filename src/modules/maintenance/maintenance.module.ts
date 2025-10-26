import { Module } from '@nestjs/common';
import { MaintenanceCalculatorService } from './services/maintenance-calculator.service';
import { PrismaModule } from '@/database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MaintenanceCalculatorService],
  exports: [MaintenanceCalculatorService],
})
export class MaintenanceModule {}
