/**
 * Health Controller - System Health Monitoring
 *
 * Provides health check endpoints for monitoring system status,
 * database connectivity, and service availability.
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuthService } from '../../auth/services/auth.service';
import { WebhookService } from '../../webhook/services/webhook.service';
import { BotService } from '../../bot/services/bot.service';
import { WhatsAppService } from '../../whatsapp/services/whatsapp.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly webhookService: WebhookService,
    private readonly botService: BotService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * Basic Health Check
   * Returns overall system health status
   */
  @Get()
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    services: Record<string, any>;
  }> {
    const services = await this.checkAllServices();

    const overallStatus = this.determineOverallStatus(services);

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    };

    if (overallStatus !== 'healthy') {
      this.logger.warn('Health check failed:', response);
    }

    return response;
  }

  /**
   * Detailed Health Check
   * Returns comprehensive health information
   */
  @Get('detailed')
  async getDetailedHealth(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    services: Record<string, any>;
    system: Record<string, any>;
  }> {
    const services = await this.checkAllServices();
    const overallStatus = this.determineOverallStatus(services);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services,
      system: {
        platform: process.platform,
        version: process.version,
        arch: process.arch,
        pid: process.pid,
      },
    };
  }

  /**
   * Database Health Check
   */
  @Get('database')
  async getDatabaseHealth(): Promise<{
    status: string;
    timestamp: string;
    database: any;
  }> {
    try {
      // Test database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          type: 'postgresql',
          status: 'connected',
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          type: 'postgresql',
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * WhatsApp Service Health Check
   */
  @Get('whatsapp')
  getWhatsAppHealth(): {
    status: string;
    timestamp: string;
    whatsApp: any;
  } {
    const whatsAppStatus = this.whatsAppService.getHealthStatus();

    return {
      status: whatsAppStatus.status,
      timestamp: new Date().toISOString(),
      whatsApp: whatsAppStatus,
    };
  }

  /**
   * Authentication Service Health Check
   */
  @Get('auth')
  getAuthHealth(): {
    status: string;
    timestamp: string;
    auth: any;
  } {
    const authStatus = this.authService.getHealthStatus();

    return {
      status: authStatus.status,
      timestamp: new Date().toISOString(),
      auth: authStatus,
    };
  }

  /**
   * Bot Service Health Check
   */
  @Get('bot')
  getBotHealth(): {
    status: string;
    timestamp: string;
    bot: any;
  } {
    const botStatus = this.botService.getHealthStatus();

    return {
      status: botStatus.status,
      timestamp: new Date().toISOString(),
      bot: botStatus,
    };
  }

  /**
   * Webhook Service Health Check
   */
  @Get('webhook')
  getWebhookHealth(): {
    status: string;
    timestamp: string;
    webhook: any;
  } {
    const webhookStatus = this.webhookService.getHealthStatus();

    return {
      status: webhookStatus.status,
      timestamp: new Date().toISOString(),
      webhook: webhookStatus,
    };
  }

  /**
   * Check all services health
   */
  private async checkAllServices(): Promise<Record<string, any>> {
    const services: Record<string, any> = {};

    // Database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = { status: 'healthy' };
    } catch (error) {
      services.database = { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // WhatsApp
    services.whatsApp = this.whatsAppService.getHealthStatus();

    // Auth
    services.auth = this.authService.getHealthStatus();

    // Bot
    services.bot = this.botService.getHealthStatus();

    // Webhook
    services.webhook = this.webhookService.getHealthStatus();

    return services;
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(services: Record<string, any>): string {
    // Critical services that must be healthy
    const criticalServices = ['database', 'auth'];

    for (const service of criticalServices) {
      if (services[service]?.status !== 'healthy') {
        return 'unhealthy';
      }
    }

    // Check if any service is unhealthy
    for (const service of Object.values(services)) {
      if ((service as any)?.status === 'unhealthy') {
        return 'degraded';
      }
    }

    return 'healthy';
  }
}
