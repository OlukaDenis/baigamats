import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '@shared/config/env';
import { tokenStorage } from '@shared/services/tokenStorage';
import { generateIdempotencyKey } from '@shared/utils/idempotency';
import { setupHorecaMockAdapter } from '../mock/horecaMockAdapter';
import type {
  AddItemDto,
  BillDto,
  CloseShiftDto,
  CreateOrderDto,
  CreateTableDto,
  CurrentShiftResponse,
  KitchenTicket,
  LoginDto,
  LoginResponse,
  MeResponse,
  MenuTree,
  OpenShiftDto,
  Order,
  PaymentStatus,
  Receipt,
  SetPinDto,
  Shift,
  StaffMember,
  StartPaymentDto,
  Table,
  UpdateTableDto,
  VerifyPinDto,
  VerifyPinResponse,
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

export type UpdateMenuItemDto = Partial<CreateMenuItemDto>;

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
  mfaVerify: async (factorId: string, code: string, mfaSession: { accessToken: string; refreshToken: string }): Promise<LoginResponse> => {
    const res = await horecaClient.post('/v1/auth/mfa/verify', { factorId, code, mfaSession }, { skipAuth: true });
    return res.data;
  },
  me: async (): Promise<MeResponse> => {
    const res = await horecaClient.get('/v1/me');
    return res.data;
  },
  logout: async (): Promise<{ signedOut: boolean }> => {
    const res = await horecaClient.post('/v1/auth/logout');
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
  getTables: async (): Promise<Table[]> => {
    const res = await horecaClient.get('/v1/tables');
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

  // Menu
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
  getOrders: async (params?: { status?: string; tableId?: string; limit?: number; offset?: number }): Promise<{ items: Order[]; total: number }> => {
    const res = await horecaClient.get('/v1/orders', { params });
    return res.data;
  },
  createOrder: async (dto: CreateOrderDto): Promise<Order> => {
    const res = await horecaClient.post('/v1/orders', dto);
    return res.data;
  },
  getOrder: async (id: string): Promise<Order> => {
    const res = await horecaClient.get(`/v1/orders/${id}`);
    return res.data;
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
  billCash: async (orderId: string, dto: BillDto): Promise<{ orderId: string; status: string; saleNumber: string; saleId: string }> => {
    const res = await horecaClient.post(`/v1/orders/${orderId}/bill`, dto);
    return res.data;
  },
  startPayment: async (orderId: string, dto: StartPaymentDto): Promise<{ orderId: string; paymentId: string; state: string; amount: number }> => {
    const res = await horecaClient.post(`/v1/orders/${orderId}/payments`, dto);
    return res.data;
  },
  getPaymentStatus: async (orderId: string, paymentId: string): Promise<PaymentStatus> => {
    const res = await horecaClient.get(`/v1/orders/${orderId}/payments/${paymentId}`);
    return res.data;
  },
  getReceipt: async (orderId: string): Promise<Receipt> => {
    const res = await horecaClient.get(`/v1/orders/${orderId}/receipt`);
    return res.data;
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

  // Reports
  getDailyReport: async (date?: string): Promise<DailyReport> => {
    const res = await horecaClient.get('/v1/reports/daily', { params: { date } });
    return res.data;
  },
  getRangeReport: async (from: string, to: string): Promise<RangeReport> => {
    const res = await horecaClient.get('/v1/reports/range', { params: { from, to } });
    return res.data;
  },
};
