import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '@shared/config/env';
import { tokenStorage } from '@shared/services/tokenStorage';
import { generateIdempotencyKey } from '@shared/utils/idempotency';
import { setupHorecaMockAdapter } from '../mock/horecaMockAdapter';
import {
  type AddItemDto,
  type BillDto,
  type BillResponse,
  type BusinessProfile,
  businessProfileSchema,
  type CloseShiftDto,
  type CreateOrderDto,
  type CreateTableDto,
  type CurrentShiftResponse,
  type HorecaDashboardData,
  horecaDashboardSchema,
  type HorecaDashboardSettings,
  horecaDashboardSettingsSchema,
  type KitchenTicket,
  type LoginDto,
  type LoginResponse,
  type MeResponse,
  type MenuAvailabilityMap,
  type MenuCategory,
  type MenuItem,
  type MenuItemsPage,
  type MenuTree,
  type MenuVersion,
  type OpenShiftDto,
  type Order,
  type PinLoginDto,
  type PaymentStatus,
  type Receipt,
  type SetPinDto,
  type Shift,
  type StaffMember,
  type StartPaymentDto,
  type StartPaymentResponse,
  type Table,
  type TableCategory,
  type UpdateHorecaDashboardSettingsDto,
  type UpdateTableDto,
  type VerifyPinDto,
  type VerifyPinResponse,
} from './schemas';

// Additional interface types
export interface CreateCategoryDto {
  name: string;
  sortOrder?: number;
}

export interface CreateMenuItemDto {
  name: string;
  price: number;
  station: 'kitchen' | 'bar';
  categoryId?: string;
  ageRestricted?: boolean;
}

export type UpdateMenuItemDto = Partial<CreateMenuItemDto> & {
  isActive?: boolean;
};

export interface GetMenuItemsParams {
  station?: 'kitchen' | 'bar';
  category_id?: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

export interface SetRoleDto {
  role: 'manager' | 'cashier' | 'waiter' | 'kitchen';
}

export interface DailyReport {
  date: string;
  orders: { open: number; billed: number; paid: number; cancelled: number };
  sales: number;
  serviceCharge: number;
  byOrderType: Record<string, { orders: number; sales: number }>;
  topItems: Array<{ name: string; qty: number; revenue: number }>;
}

export interface RangeReport {
  from: string;
  to: string;
  orders: { open: number; billed: number; paid: number; cancelled: number };
  sales: number;
  serviceCharge: number;
  average: number;
  byOrderType: Record<string, { orders: number; sales: number }>;
  byMethod: Record<string, { sales: number; amount: number }>;
  byDay: Array<{ date: string; orders: number; sales: number; methods: Record<string, number> }>;
  byWaiter: Array<{ name: string; orders: number; sales: number }>;
  topItems: Array<{ name: string; qty: number; revenue: number }>;
}

let refreshPromise: Promise<string | null> | null = null;

export function createHorecaAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: env.HORECA_API_BASE_URL,
    timeout: env.API_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (!config.skipAuth) {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Attach Idempotency-Key on mutating money & order endpoints
    if (['post', 'patch', 'put'].includes(config.method?.toLowerCase() ?? '')) {
      if (!config.headers.has('Idempotency-Key')) {
        config.headers.set('Idempotency-Key', generateIdempotencyKey());
      }
    }

    return config;
  });

  instance.interceptors.response.use(
    response => {
      // Automatic standard envelope unwrapping
      if (response.data && typeof response.data === 'object' && 'payload' in response.data) {
        return {
          ...response,
          data: response.data.payload,
        };
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (error.response?.status === 401 && !originalRequest?._retry && !originalRequest?.skipAuth) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = (async () => {
              const refreshToken = await tokenStorage.getRefreshToken();
              if (!refreshToken) return null;
              const res = await axios.post(
                `${env.HORECA_API_BASE_URL}/v1/auth/refresh`,
                { refreshToken },
                { timeout: env.API_TIMEOUT_MS },
              );
              const session = res.data?.payload?.session;
              if (session?.accessToken) {
                await tokenStorage.saveTokens({
                  accessToken: session.accessToken,
                  refreshToken: session.refreshToken ?? refreshToken,
                });
                return session.accessToken;
              }
              return null;
            })().finally(() => {
              refreshPromise = null;
            });
          }

          const newAccessToken = await refreshPromise;
          if (newAccessToken) {
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
            return instance(originalRequest);
          }
        } catch {
          await tokenStorage.clearTokens();
        }
      }
      return Promise.reject(error);
    },
  );

  setupHorecaMockAdapter(instance);

  return instance;
}

export const horecaClient = createHorecaAxiosInstance();

export const horecaApi = {
  // Auth
  login: async (dto: LoginDto): Promise<LoginResponse> => {
    const res = await horecaClient.post('/v1/auth/login', dto, { skipAuth: true });
    return res.data;
  },
  pinLogin: async (dto: PinLoginDto): Promise<LoginResponse> => {
    const res = await horecaClient.post('/v1/auth/pin-login', dto, { skipAuth: true });
    return res.data;
  },
  mfaVerify: async (factorId: string, code: string, mfaSession: { accessToken: string; refreshToken: string }): Promise<LoginResponse> => {
    const res = await horecaClient.post('/v1/auth/mfa/verify', { factorId, code, mfaSession }, { skipAuth: true });
    return res.data;
  },
  me: async (): Promise<MeResponse> => {
    const res = await horecaClient.get('/v1/me');
    return res.data;
  },
  getBusiness: async (): Promise<BusinessProfile> => {
    let res;
    try {
      res = await horecaClient.get('/business', {
        baseURL: env.API_BASE_URL,
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        res = await horecaClient.get('/api/v1/business', {
          baseURL: env.API_BASE_URL,
        });
      } else {
        throw err;
      }
    }
    const raw =
      res.data && typeof res.data === 'object' && 'data' in res.data && res.data.data
        ? res.data.data
        : res.data;
    return businessProfileSchema.parse(raw);
  },
  logout: async (accessToken?: string): Promise<{ signedOut: boolean }> => {
    const res = await horecaClient.post(
      '/v1/auth/logout',
      undefined,
      accessToken
        ? {
            skipAuth: true,
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    );
    return res.data;
  },

  // Staff & PIN
  getStaff: async (): Promise<StaffMember[]> => {
    const res = await horecaClient.get('/v1/staff');
    return res.data;
  },
  verifyPin: async (dto: VerifyPinDto): Promise<VerifyPinResponse> => {
    const res = await horecaClient.post('/v1/staff/verify-pin', dto);
    return res.data;
  },
  setStaffPin: async (staffId: string, dto: SetPinDto): Promise<{ saved: boolean }> => {
    const res = await horecaClient.put(`/v1/staff/${staffId}/pin`, dto);
    return res.data;
  },
  setStaffRole: async (staffId: string, dto: SetRoleDto): Promise<{ saved: boolean; role: string }> => {
    const res = await horecaClient.put(`/v1/staff/${staffId}/role`, dto);
    return res.data;
  },

  // Tables
  getTables: async (section?: string): Promise<Table[]> => {
    try {
      const res = await horecaClient.get('/tables', {
        params: section ? { section } : undefined,
      });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.get('/v1/tables', {
          params: section ? { section } : undefined,
        });
        return res.data;
      }
      throw err;
    }
  },
  getTableCategories: async (): Promise<TableCategory[]> => {
    const res = await horecaClient.get('/v1/tables/categories');
    return res.data;
  },
  createTable: async (dto: CreateTableDto): Promise<Table> => {
    const res = await horecaClient.post('/v1/tables', dto);
    return res.data;
  },
  updateTable: async (id: string, dto: UpdateTableDto): Promise<Table> => {
    const res = await horecaClient.patch(`/v1/tables/${id}`, dto);
    return res.data;
  },
  deleteTable: async (id: string): Promise<{ removed: boolean }> => {
    const res = await horecaClient.delete(`/v1/tables/${id}`);
    return res.data;
  },
  setTableStatus: async (id: string, status: 'available' | 'reserved' | 'dirty'): Promise<Table> => {
    const res = await horecaClient.patch(`/v1/tables/${id}/status`, { status });
    return res.data;
  },

  // Menu (v2)
  getMenuVersion: async (): Promise<MenuVersion> => {
    const res = await horecaClient.get('/v1/menu/version');
    return res.data;
  },
  getMenuCategories: async (
    etag?: string,
  ): Promise<{ notModified: boolean; data?: MenuCategory[]; etag?: string }> => {
    const res = await horecaClient.get('/v1/menu/categories', {
      headers: etag ? { 'If-None-Match': etag } : undefined,
      validateStatus: status => status === 200 || status === 304,
    });
    const nextEtag = res.headers?.etag ?? res.headers?.ETag;
    if (res.status === 304) {
      return { notModified: true, etag: nextEtag ?? etag };
    }
    return { notModified: false, data: res.data, etag: nextEtag };
  },
  getMenuItems: async (
    params?: GetMenuItemsParams,
    etag?: string,
  ): Promise<{ notModified: boolean; data?: MenuItemsPage; etag?: string }> => {
    const query = params
      ? {
          station: params.station,
          category_id: params.category_id,
          includeInactive: params.includeInactive ? 'true' : undefined,
          limit: params.limit,
          offset: params.offset,
        }
      : undefined;
    const res = await horecaClient.get('/v1/menu/items', {
      params: query,
      headers: etag ? { 'If-None-Match': etag } : undefined,
      validateStatus: status => status === 200 || status === 304,
    });
    const nextEtag = res.headers?.etag ?? res.headers?.ETag;
    if (res.status === 304) {
      return { notModified: true, etag: nextEtag ?? etag };
    }
    return { notModified: false, data: res.data, etag: nextEtag };
  },
  getAllMenuItems: async (
    params?: Omit<GetMenuItemsParams, 'limit' | 'offset'>,
  ): Promise<MenuItem[]> => {
    const pageSize = 200;
    let offset = 0;
    const allItems: MenuItem[] = [];

    while (true) {
      const { data } = await horecaApi.getMenuItems({
        ...params,
        limit: pageSize,
        offset,
      });
      if (!data || !Array.isArray(data.items)) break;
      allItems.push(...data.items);
      offset += data.limit || pageSize;
      if (offset >= data.total || data.items.length === 0) break;
    }

    return allItems;
  },
  getMenuAvailability: async (): Promise<MenuAvailabilityMap> => {
    const res = await horecaClient.get('/v1/menu/items/availability');
    return res.data;
  },
  getMenuItem: async (id: string): Promise<MenuItem> => {
    const res = await horecaClient.get(`/v1/menu/items/${id}`);
    return res.data;
  },
  /** @deprecated Legacy nested menu endpoint; use Menu API v2 methods above. */
  getMenu: async (includeInactive = false): Promise<MenuTree> => {
    const res = await horecaClient.get('/v1/menu', { params: { includeInactive: includeInactive ? '1' : undefined } });
    return res.data;
  },
  createCategory: async (dto: CreateCategoryDto) => {
    const res = await horecaClient.post('/v1/menu/categories', dto);
    return res.data;
  },
  createMenuItem: async (dto: CreateMenuItemDto) => {
    const res = await horecaClient.post('/v1/menu/items', dto);
    return res.data;
  },
  updateMenuItem: async (id: string, dto: UpdateMenuItemDto) => {
    const res = await horecaClient.patch(`/v1/menu/items/${id}`, dto);
    return res.data;
  },

  // Orders
  getOrders: async (params?: {
    status?: string;
    tableId?: string;
    limit?: number;
    offset?: number;
    mine?: boolean | string;
  }): Promise<{ items: Order[]; total: number } | Order[]> => {
    try {
      const res = await horecaClient.get('/v1/orders', { params });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.get('/orders', { params });
        return res.data;
      }
      throw err;
    }
  },
  createOrder: async (dto: CreateOrderDto): Promise<Order> => {
    try {
      const res = await horecaClient.post('/v1/orders', dto);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.post('/orders', dto);
        return res.data;
      }
      throw err;
    }
  },
  getOrder: async (id: string): Promise<Order> => {
    try {
      const res = await horecaClient.get(`/v1/orders/${id}`);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.get(`/orders/${id}`);
        return res.data;
      }
      throw err;
    }
  },
  addItemToOrder: async (orderId: string, dto: AddItemDto): Promise<{ item: any; orderTotal: number }> => {
    const res = await horecaClient.post(`/v1/orders/${orderId}/items`, dto);
    return res.data;
  },
  removeItemFromOrder: async (orderId: string, itemId: string): Promise<{ orderTotal: number }> => {
    const res = await horecaClient.delete(`/v1/orders/${orderId}/items/${itemId}`);
    return res.data;
  },
  updateItemKotStatus: async (orderId: string, itemId: string, status: string): Promise<any> => {
    const res = await horecaClient.patch(`/v1/orders/${orderId}/items/${itemId}/status`, { status });
    return res.data;
  },
  cancelOrder: async (id: string): Promise<{ id: string; status: 'cancelled' }> => {
    const res = await horecaClient.post(`/v1/orders/${id}/cancel`);
    return res.data;
  },

  // Kitchen
  getKitchenTickets: async (station?: 'kitchen' | 'bar'): Promise<KitchenTicket[]> => {
    const res = await horecaClient.get('/v1/kitchen', { params: { station } });
    return res.data;
  },

  // Billing & Payments
  billCash: async (orderId: string, dto: BillDto): Promise<BillResponse> => {
    try {
      const res = await horecaClient.post(`/v1/orders/${orderId}/bill`, dto);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.post(`/orders/${orderId}/bill`, dto);
        return res.data;
      }
      throw err;
    }
  },
  startPayment: async (orderId: string, dto: StartPaymentDto): Promise<StartPaymentResponse> => {
    try {
      const res = await horecaClient.post(`/v1/orders/${orderId}/payments`, dto);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.post(`/orders/${orderId}/payments`, dto);
        return res.data;
      }
      throw err;
    }
  },
  getPaymentStatus: async (orderId: string, paymentId: string): Promise<PaymentStatus> => {
    try {
      const res = await horecaClient.get(`/v1/orders/${orderId}/payments/${paymentId}`);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.get(`/orders/${orderId}/payments/${paymentId}`);
        return res.data;
      }
      throw err;
    }
  },
  getReceipt: async (orderId: string): Promise<Receipt> => {
    try {
      const res = await horecaClient.get(`/v1/orders/${orderId}/receipt`);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res = await horecaClient.get(`/orders/${orderId}/receipt`);
        return res.data;
      }
      throw err;
    }
  },

  // Shifts
  getCurrentShift: async (): Promise<CurrentShiftResponse> => {
    const res = await horecaClient.get('/v1/shifts/current');
    return res.data;
  },
  getShiftsHistory: async (): Promise<Shift[]> => {
    const res = await horecaClient.get('/v1/shifts');
    return res.data;
  },
  openShift: async (dto: OpenShiftDto): Promise<Shift> => {
    const res = await horecaClient.post('/v1/shifts/open', dto);
    return res.data;
  },
  closeShift: async (dto: CloseShiftDto): Promise<any> => {
    const res = await horecaClient.post('/v1/shifts/close', dto);
    return res.data;
  },

  // Reports & Manager Dashboard (GET /api/v1/horeca/dashboard)
  getDashboard: async (params?: {
    date?: string;
    from?: string;
    to?: string;
  }): Promise<HorecaDashboardData> => {
    const query =
      params?.from || params?.to
        ? { from: params?.from, to: params?.to }
        : params?.date
          ? { date: params.date }
          : undefined;

    let res;
    try {
      res = await horecaClient.get('/horeca/dashboard', {
        baseURL: env.API_BASE_URL,
        params: query,
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        res = await horecaClient.get('/api/v1/horeca/dashboard', {
          baseURL: env.API_BASE_URL,
          params: query,
        });
      } else {
        throw new Error(extractDashboardErrorMessage(err));
      }
    }

    const raw = unwrapDashboardEnvelope(res.data);
    return horecaDashboardSchema.parse(raw);
  },

  getDashboardSettings: async (): Promise<HorecaDashboardSettings> => {
    let res;
    try {
      res = await horecaClient.get('/horeca/dashboard/settings', {
        baseURL: env.API_BASE_URL,
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        res = await horecaClient.get('/api/v1/horeca/dashboard/settings', {
          baseURL: env.API_BASE_URL,
        });
      } else {
        throw new Error(extractDashboardErrorMessage(err));
      }
    }

    const raw = unwrapDashboardEnvelope(res.data);
    return horecaDashboardSettingsSchema.parse(raw);
  },

  updateDashboardSettings: async (
    dto: UpdateHorecaDashboardSettingsDto,
  ): Promise<HorecaDashboardSettings> => {
    const payload = {
      target_check: Math.round(Number(dto.target_check)),
      optimal_turn: Math.round(Number(dto.optimal_turn)),
    };
    let res;
    try {
      res = await horecaClient.put('/horeca/dashboard/settings', payload, {
        baseURL: env.API_BASE_URL,
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        res = await horecaClient.put('/api/v1/horeca/dashboard/settings', payload, {
          baseURL: env.API_BASE_URL,
        });
      } else {
        throw new Error(extractDashboardErrorMessage(err));
      }
    }

    const raw = unwrapDashboardEnvelope(res.data);
    return horecaDashboardSettingsSchema.parse(raw);
  },

  getDailyReport: async (date?: string): Promise<DailyReport> => {
    const res = await horecaClient.get('/v1/reports/daily', { params: { date } });
    return res.data;
  },
  getRangeReport: async (from: string, to: string): Promise<RangeReport> => {
    const res = await horecaClient.get('/v1/reports/range', { params: { from, to } });
    return res.data;
  },
};

function unwrapDashboardEnvelope(body: any): any {
  if (!body || typeof body !== 'object') {
    throw new Error('Unexpected empty response from dashboard server.');
  }

  // Handle HTTP 200 with {"data": null, "error": "<message>"} per handoff section 5
  if (body.error) {
    const errMsg =
      typeof body.error === 'string'
        ? body.error
        : body.error?.message || 'Unable to load dashboard figures.';
    throw new Error(errMsg);
  }

  if ('data' in body) {
    if (body.data === null || body.data === undefined) {
      throw new Error('No dashboard data returned from server.');
    }
    return body.data;
  }

  return body;
}

export function extractDashboardErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const retryAfter = err?.response?.headers?.['retry-after'] ?? err?.response?.headers?.['Retry-After'];

  if (data?.error) {
    if (typeof data.error === 'string') {
      return data.error;
    }
    if (typeof data.error?.message === 'string') {
      if (status === 429 && retryAfter) {
        return `${data.error.message} (Retry after ${retryAfter}s)`;
      }
      return data.error.message;
    }
  }

  if (status === 401) {
    return 'Session expired or unauthorized. Please sign in again.';
  }
  if (status === 403) {
    return 'Access denied. Manager permissions (account:read) are required to view reports.';
  }
  if (status === 429) {
    return retryAfter
      ? `Too many requests. Please wait ${retryAfter} seconds and try again.`
      : 'Too many requests. Please wait a moment and try again.';
  }

  if (typeof data?.message === 'string') {
    return data.message;
  }

  return err?.message || 'Unable to load dashboard figures.';
}

