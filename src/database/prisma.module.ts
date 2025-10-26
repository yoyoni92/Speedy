import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global Prisma module that provides database access throughout the application
 * Marked as @Global to make PrismaService available in all modules without explicit imports
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
