/**
 * Health Controller - Unit Tests
 *
 * Tests for system health monitoring endpoints and service status checks.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../../database/prisma.service';
import { AuthService } from '../../auth/services/auth.service';
import { WebhookService } from '../../webhook/services/webhook.service';
import { BotService } from '../../bot/services/bot.service';
import { WhatsAppService } from '../../whatsapp/services/whatsapp.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: any;
  let authService: any;
  let webhookService: any;
  let botService: any;
  let whatsAppService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const mockAuthService = {
      getHealthStatus: jest.fn(),
    };

    const mockWebhookService = {
      getHealthStatus: jest.fn(),
    };

    const mockBotService = {
      getHealthStatus: jest.fn(),
    };

    const mockWhatsAppService = {
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
        {
          provide: BotService,
          useValue: mockBotService,
        },
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get(PrismaService);
    authService = module.get(AuthService);
    webhookService = module.get(WebhookService);
    botService = module.get(BotService);
    whatsAppService = module.get(WhatsAppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return healthy status when all services are healthy', async () => {
      // Mock all services as healthy
      prismaService.$queryRaw.mockResolvedValue([1]);
      authService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      webhookService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      botService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      whatsAppService.getHealthStatus.mockReturnValue({ status: 'healthy', configured: true });

      const result = await controller.getHealth();

      expect(result.status).toBe('healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result.services.database.status).toBe('healthy');
      expect(result.services.auth.status).toBe('healthy');
    });

    it('should return unhealthy status when critical service fails', async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error('DB connection failed'));
      authService.getHealthStatus.mockReturnValue({ status: 'healthy' });

      const result = await controller.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('unhealthy');
    });

    it('should return degraded status when non-critical service fails', async () => {
      prismaService.$queryRaw.mockResolvedValue([1]);
      authService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      whatsAppService.getHealthStatus.mockReturnValue({ status: 'unhealthy', configured: false });

      const result = await controller.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.whatsApp.status).toBe('unhealthy');
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health information', async () => {
      prismaService.$queryRaw.mockResolvedValue([1]);
      authService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      webhookService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      botService.getHealthStatus.mockReturnValue({ status: 'healthy' });
      whatsAppService.getHealthStatus.mockReturnValue({ status: 'healthy', configured: true });

      const result = await controller.getDetailedHealth();

      expect(result.status).toBe('healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('system');
      expect(result.services).toBeDefined();
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return healthy database status', async () => {
      prismaService.$queryRaw.mockResolvedValue([1]);

      const result = await controller.getDatabaseHealth();

      expect(result.status).toBe('healthy');
      expect(result.database.status).toBe('connected');
      expect(result.database.type).toBe('postgresql');
    });

    it('should return unhealthy database status on connection failure', async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error('Connection timeout'));

      const result = await controller.getDatabaseHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.database.status).toBe('disconnected');
      expect(result.database.error).toBe('Connection timeout');
    });
  });

  describe('getWhatsAppHealth', () => {
    it('should return WhatsApp service health', () => {
      const mockStatus = { status: 'healthy', configured: true };
      whatsAppService.getHealthStatus.mockReturnValue(mockStatus);

      const result = controller.getWhatsAppHealth();

      expect(result.status).toBe('healthy');
      expect(result.whatsApp).toEqual(mockStatus);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getAuthHealth', () => {
    it('should return auth service health', () => {
      const mockStatus = { status: 'healthy', database: true, jwt: true };
      authService.getHealthStatus.mockReturnValue(mockStatus);

      const result = controller.getAuthHealth();

      expect(result.status).toBe('healthy');
      expect(result.auth).toEqual(mockStatus);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getBotHealth', () => {
    it('should return bot service health', () => {
      const mockStatus = { status: 'healthy', whatsAppConfigured: true, stateMachineHealthy: true };
      botService.getHealthStatus.mockReturnValue(mockStatus);

      const result = controller.getBotHealth();

      expect(result.status).toBe('healthy');
      expect(result.bot).toEqual(mockStatus);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getWebhookHealth', () => {
    it('should return webhook service health', () => {
      const mockStatus = {
        status: 'healthy',
        authService: true,
        botService: true,
        whatsAppService: true,
      };
      webhookService.getHealthStatus.mockReturnValue(mockStatus);

      const result = controller.getWebhookHealth();

      expect(result.status).toBe('healthy');
      expect(result.webhook).toEqual(mockStatus);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('determineOverallStatus', () => {
    it('should return healthy when all services are healthy', () => {
      const services = {
        database: { status: 'healthy' },
        auth: { status: 'healthy' },
        whatsApp: { status: 'healthy' },
      };

      const result = (controller as any).determineOverallStatus(services);
      expect(result).toBe('healthy');
    });

    it('should return unhealthy when critical service fails', () => {
      const services = {
        database: { status: 'unhealthy' },
        auth: { status: 'healthy' },
      };

      const result = (controller as any).determineOverallStatus(services);
      expect(result).toBe('unhealthy');
    });

    it('should return degraded when non-critical service fails', () => {
      const services = {
        database: { status: 'healthy' },
        auth: { status: 'healthy' },
        whatsApp: { status: 'unhealthy' },
      };

      const result = (controller as any).determineOverallStatus(services);
      expect(result).toBe('degraded');
    });
  });
});