import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '@shared/config/env';
import {
  mockActiveOrder,
  mockCurrentShift,
  mockKitchenTickets,
  mockMenuCategories,
  mockReceipt,
  mockStaffMembers,
  mockTables,
} from './horecaMockData';

/**
 * Attaches mock interceptor to HORECA Axios instance when ENABLE_MOCK is active.
 * When ENABLE_MOCK=false, requests pass directly to the real server.
 */
export function setupHorecaMockAdapter(client: AxiosInstance) {
  if (!env.ENABLE_MOCK) {
    return;
  }

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const url = config.url || '';
    const method = (config.method || 'get').toLowerCase();

    // Check if mock handler exists for this route
    const mockResponse = getMockResponse(method, url, config.data);
    if (mockResponse !== undefined) {
      // Simulate slight network latency (150ms)
      await new Promise(resolve => setTimeout(() => resolve(undefined), 150));

      // Resolve with standard unwrapped payload
      config.adapter = async () => ({
        data: {
          statusCode: 200,
          message: 'OK (Mock)',
          payload: mockResponse,
          timestamp: new Date().toISOString(),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    }

    return config;
  });
}

function getMockResponse(method: string, url: string, data?: any): any {
  // GET /v1/health
  if (url.includes('/v1/health')) {
    return { service: 'horeca-api', status: 'up', database: 'up' };
  }

  // GET /v1/me
  if (url.includes('/v1/me')) {
    return {
      userId: 'staff-01',
      name: 'Alex R.',
      organizationId: 'org-horeca-01',
      role: 'manager',
      permissions: [
        'tables:read',
        'tables:write',
        'orders:read',
        'orders:write',
        'billing:write',
        'payments:read',
        'reports:read',
        'shifts:read',
        'shifts:write',
        'staff:write',
      ],
    };
  }

  // GET /v1/staff
  if (url.includes('/v1/staff') && method === 'get') {
    return mockStaffMembers;
  }

  // POST /v1/staff/verify-pin
  if (url.includes('/v1/staff/verify-pin') && method === 'post') {
    const body = typeof data === 'string' ? JSON.parse(data) : data;
    const staff = mockStaffMembers.find(s => s.id === body?.userId) || mockStaffMembers[0];
    return {
      ok: true,
      userId: staff.id,
      name: staff.name,
      role: staff.role,
    };
  }

  // PUT /v1/staff/{id}/pin
  if (url.match(/\/v1\/staff\/[^/]+\/pin/) && method === 'put') {
    return { saved: true };
  }

  // GET /v1/tables
  if (url.includes('/v1/tables') && method === 'get') {
    return mockTables;
  }

  // GET /v1/menu
  if (url.includes('/v1/menu') && method === 'get') {
    return {
      categories: mockMenuCategories,
      uncategorised: [],
    };
  }

  // GET /v1/orders
  if (url.includes('/v1/orders') && method === 'get') {
    return {
      items: [mockActiveOrder],
      total: 1,
      limit: 50,
      offset: 0,
    };
  }

  // POST /v1/orders
  if (url.endsWith('/v1/orders') && method === 'post') {
    const body = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      id: `ord-${Date.now()}`,
      order_number: `#${Math.floor(1000 + Math.random() * 9000)}`,
      table_id: body?.tableId || null,
      order_type: body?.orderType || 'dine_in',
      status: 'open',
      tab_name: body?.tabName || null,
      party_size: body?.partySize || 2,
      total_amount: 0,
      created_at: new Date().toISOString(),
    };
  }

  // GET /v1/kitchen
  if (url.includes('/v1/kitchen') && method === 'get') {
    return mockKitchenTickets;
  }

  // POST /v1/orders/{id}/bill
  if (url.includes('/bill') && method === 'post') {
    return {
      orderId: 'ord-8429',
      status: 'billed',
      paymentMethod: 'cash',
      saleId: `s-${Date.now()}`,
      saleNumber: `SALE-${Math.floor(10000000 + Math.random() * 90000000)}`,
    };
  }

  // POST /v1/orders/{id}/payments
  if (url.includes('/payments') && method === 'post') {
    return {
      orderId: 'ord-8429',
      paymentId: `pay_${Math.random().toString(36).substring(2, 6)}`,
      amount: 540_000,
      chargeAmount: 540_000,
      feeAmount: 0,
      method: 'mobile_money',
      paymentUrl: null,
      state: 'pending',
    };
  }

  // GET /v1/orders/{id}/receipt
  if (url.includes('/receipt') && method === 'get') {
    return mockReceipt;
  }

  // GET /v1/shifts/current
  if (url.includes('/v1/shifts/current')) {
    return {
      open: true,
      shift: mockCurrentShift,
      takings: {
        byMethod: {
          cash: { sales: 4, amount: 540_000 },
          mobile_money: { sales: 1, amount: 120_000 },
        },
        total: 660_000,
        cash: 540_000,
      },
      expectedCash: 590_000,
    };
  }

  // POST /v1/auth/login
  if (url.includes('/v1/auth/login')) {
    return {
      mfaRequired: false,
      session: {
        accessToken: 'mock_jwt_access_token',
        refreshToken: 'mock_refresh_token',
        tokenType: 'bearer',
        expiresIn: 3600,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      user: { id: 'staff-01', email: 'alex@horeca.com' },
      profile: { organizationId: 'org-horeca-01', role: 'manager' },
    };
  }

  return undefined;
}
