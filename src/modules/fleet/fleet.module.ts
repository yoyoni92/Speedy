import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';

// Services
import { MotorcycleService } from './services/motorcycle.service';
import { CourierService } from './services/courier.service';
import { ClientService } from './services/client.service';

// Interfaces (for dependency injection if needed)
import { IMotorcycleService } from './interfaces/motorcycle.interface';
import { ICourierService } from './interfaces/courier.interface';
import { IClientService } from './interfaces/client.interface';

@Module({
  imports: [PrismaModule],
  providers: [
    // Services
    {
      provide: MotorcycleService,
      useClass: MotorcycleService,
    },
    {
      provide: CourierService,
      useClass: CourierService,
    },
    {
      provide: ClientService,
      useClass: ClientService,
    },
    MotorcycleService,
    CourierService,
    ClientService,
  ],
  exports: [
    // Services
    MotorcycleService,
    CourierService,
    ClientService,
  ],
})
export class FleetModule {}
