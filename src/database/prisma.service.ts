import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { config } from '@/config/env.config';

/**
 * Prisma service that extends PrismaClient with NestJS lifecycle hooks
 * Provides database connection management and query logging
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: config.database.enableLogging
        ? [
            { level: 'query', emit: 'event' as any },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : [
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ],
    });
  }

  /**
   * Initialize database connection and set up logging
   */
  async onModuleInit(): Promise<void> {
    // Set up query logging if enabled
    if (config.database.enableLogging) {
      // Using any type to handle Prisma's event system
      (this as any).$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Clean up database connection
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  /**
   * Execute operations within a database transaction
   * @param fn Function to execute within transaction
   * @returns Promise with transaction result
   */
  async executeInTransaction<T>(
    fn: (prisma: Omit<PrismaClient, '$on' | '$connect' | '$disconnect' | '$use' | '$transaction' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }

  /**
   * Health check for database connection
   * @returns Promise<boolean> indicating if database is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * Get database connection info for monitoring
   */
  async getConnectionInfo(): Promise<{
    status: string;
    database: string;
    host: string;
  }> {
    try {
      const result = await this.$queryRaw<Array<{ current_database: string }>>`
        SELECT current_database()
      `;
      
      return {
        status: 'connected',
        database: result[0]?.current_database || 'unknown',
        host: config.database.url.split('@')[1]?.split('/')[0] || 'unknown',
      };
    } catch (error) {
      return {
        status: 'disconnected',
        database: 'unknown',
        host: 'unknown',
      };
    }
  }
}
