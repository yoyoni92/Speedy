/**
 * Jest test setup configuration
 * Configures global test environment for Speedy Fleet Management
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/speedy_test';
process.env.WHATSAPP_API_URL = 'https://api.test.com';
process.env.WHATSAPP_ACCOUNT_SID = 'test_account_sid';
process.env.WHATSAPP_AUTH_TOKEN = 'test_auth_token';
process.env.WHATSAPP_PHONE_NUMBER = '+972501234567';
process.env.WEBHOOK_SECRET = 'test_webhook_secret';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.LOG_LEVEL = 'error'; // Reduce logging in tests
process.env.ENABLE_RATE_LIMITING = 'false';
process.env.SENTRY_DSN = '';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Date.now for consistent timestamps in tests
const mockDate = new Date('2025-10-25T10:00:00.000Z');
global.Date.now = jest.fn(() => mockDate.getTime());

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      createMockUser: (overrides?: Record<string, any>) => any;
      createMockMotorcycle: (overrides?: Record<string, any>) => any;
      createMockCourier: (overrides?: Record<string, any>) => any;
      createMockClient: (overrides?: Record<string, any>) => any;
      createMockConversation: (overrides?: Record<string, any>) => any;
    }
  }
}

// Add test utilities to global object
(global as any).createMockUser = (overrides = {}) => ({
  id: 'user-test-id',
  phoneNumber: '+972501234567',
  role: 'COURIER',
  isActive: true,
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

(global as any).createMockMotorcycle = (overrides = {}) => ({
  id: 'motorcycle-test-id',
  licensePlate: '12345678',
  type: '125',
  currentMileage: 5000,
  licenseExpiryDate: new Date('2026-12-31'),
  insuranceExpiryDate: new Date('2026-06-30'),
  insuranceType: 'SINGLE_DRIVER',
  isActive: true,
  assignedCourierId: null,
  assignedClientId: null,
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

(global as any).createMockCourier = (overrides = {}) => ({
  id: 'courier-test-id',
  userId: 'user-test-id',
  name: 'יוסי כהן',
  isActive: true,
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

(global as any).createMockClient = (overrides = {}) => ({
  id: 'client-test-id',
  name: 'חברת הובלות ירושלים',
  isActive: true,
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

(global as any).createMockConversation = (overrides = {}) => ({
  id: 'conversation-test-id',
  userId: 'user-test-id',
  state: 'IDLE',
  context: null,
  expiresAt: new Date(mockDate.getTime() + 30 * 60 * 1000), // 30 minutes from now
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Clear all Jest mocks and timers globally
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();

  // Wait for any pending async operations
  await new Promise(resolve => setImmediate(resolve));

  // Additional cleanup - close any open handles
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');
}, 10000);

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in test:', error);
});

export {};
