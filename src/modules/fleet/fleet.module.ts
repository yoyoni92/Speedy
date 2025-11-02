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
      provide: IMotorcycleService,
      useClass: MotorcycleService,
    },
    {
      provide: ICourierService,
      useClass: CourierService,
    },
    {
      provide: IClientService,
      useClass: ClientService,
    },
    MotorcycleService,
    CourierService,
    ClientService,
  ],
  exports: [
    // Services
    IMotorcycleService,
    ICourierService,
    IClientService,
    MotorcycleService,
    CourierService,
    ClientService,
  ],
})
export class FleetModule {}
