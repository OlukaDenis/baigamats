import { z } from 'zod';

// ==========================================
// Base Response Envelope
// ==========================================
export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    statusCode: z.number(),
    message: z.string(),
    payload: payloadSchema,
    timestamp: z.string(),
  });

// ==========================================
// Tables
// ==========================================
export const tableStatusSchema = z.enum(['available', 'occupied', 'reserved', 'dirty']);
export type TableStatus = z.infer<typeof tableStatusSchema>;

export const tableSchema = z.object({
  id: z.string(),
  table_number: z.string(),
  capacity: z.coerce.number(),
  status: tableStatusSchema.or(
    z.string().transform(s => {
      const lower = s.toLowerCase();
      return (['available', 'occupied', 'reserved', 'dirty'].includes(lower)
        ? lower
        : 'available') as TableStatus;
    }),
  ),
  section: z.string().nullable().optional().default('Indoor'),
});
export type Table = z.infer<typeof tableSchema>;

export const tableCategorySchema = z.object({
  name: z.string(),
  count: z.coerce.number().default(0),
});
export type TableCategory = z.infer<typeof tableCategorySchema>;

export const createTableDtoSchema = z.object({
  tableNumber: z.string(),
  capacity: z.number(),
  section: z.string().optional(),
});
export type CreateTableDto = z.infer<typeof createTableDtoSchema>;

export const updateTableDtoSchema = z.object({
  tableNumber: z.string().optional(),
  capacity: z.number().optional(),
  section: z.string().optional(),
});
export type UpdateTableDto = z.infer<typeof updateTableDtoSchema>;

// ==========================================
// Menu (API v2)
// ==========================================
export const preparationStationSchema = z.enum(['kitchen', 'bar']);
export type PreparationStation = z.infer<typeof preparationStationSchema>;

export const menuItemSchema = z.object({
  id: z.string(),
  category_id: z.string().nullable(),
  name: z.string(),
  price: z.number(),
  station: preparationStationSchema,
  is_active: z.boolean(),
  age_restricted: z.boolean(),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sort_order: z.number(),
  items: z.array(menuItemSchema).optional(),
});
export type MenuCategory = z.infer<typeof menuCategorySchema>;

export const menuVersionSchema = z.object({
  hash: z.string(),
  categories: z.number(),
  items: z.number(),
});
export type MenuVersion = z.infer<typeof menuVersionSchema>;

export const menuItemsPageSchema = z.object({
  items: z.array(menuItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type MenuItemsPage = z.infer<typeof menuItemsPageSchema>;

export const menuAvailabilitySchema = z.record(z.string(), z.boolean());
export type MenuAvailabilityMap = z.infer<typeof menuAvailabilitySchema>;

export const menuTreeSchema = z.object({
  categories: z.array(menuCategorySchema),
  uncategorised: z.array(menuItemSchema).optional().default([]),
});
export type MenuTree = z.infer<typeof menuTreeSchema>;

// ==========================================
// Orders & KOT
// ==========================================
export const orderTypeSchema = z.enum(['dine_in', 'takeaway', 'tab']);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const orderStatusSchema = z.enum(['open', 'billed', 'paid', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const kotStatusSchema = z.enum(['new', 'preparing', 'ready', 'served']);
export type KotStatus = z.infer<typeof kotStatusSchema>;

export const orderItemSchema = z.object({
  id: z.string(),
  menu_item_id: z.string(),
  item_name: z.string(),
  unit_price: z.number(),
  qty: z.number(),
  station: preparationStationSchema,
  kot_status: kotStatusSchema,
  modifiers: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  discount_amount: z.number().default(0),
  created_at: z.string(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  table_id: z.string().nullable().optional(),
  order_type: orderTypeSchema,
  status: orderStatusSchema,
  tab_name: z.string().nullable().optional(),
  party_size: z.number().nullable().optional(),
  total_amount: z.number(),
  service_charge_amount: z.number().optional().default(0),
  created_at: z.string(),
  updated_at: z.string().optional(),
  items: z.array(orderItemSchema).optional().default([]),
});
export type Order = z.infer<typeof orderSchema>;

export const createOrderDtoSchema = z.object({
  orderType: orderTypeSchema,
  tableId: z.string().optional(),
  partySize: z.number().optional(),
  tabName: z.string().optional(),
});
export type CreateOrderDto = z.infer<typeof createOrderDtoSchema>;

export const addItemDtoSchema = z.object({
  menuItemId: z.string(),
  qty: z.number().min(1),
  modifiers: z.array(z.string()).optional(),
  notes: z.string().optional(),
  ageVerifiedBy: z.string().optional(),
});
export type AddItemDto = z.infer<typeof addItemDtoSchema>;

export const kotStatusDtoSchema = z.object({
  status: kotStatusSchema,
});
export type KotStatusDto = z.infer<typeof kotStatusDtoSchema>;

// ==========================================
// Kitchen Display Ticket
// ==========================================
export const kitchenTicketSchema = z.object({
  id: z.string(),
  item_name: z.string(),
  qty: z.number(),
  station: preparationStationSchema,
  kot_status: kotStatusSchema,
  modifiers: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  order: z.object({
    id: z.string(),
    order_number: z.string(),
    table_id: z.string().nullable().optional(),
    order_type: orderTypeSchema,
    tab_name: z.string().nullable().optional(),
    status: orderStatusSchema,
  }),
});
export type KitchenTicket = z.infer<typeof kitchenTicketSchema>;

// ==========================================
// Payments & Billing
// ==========================================
export const billDtoSchema = z.object({
  paymentMethod: z.enum(['cash']),
});
export type BillDto = z.infer<typeof billDtoSchema>;

export const billResponseSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  paymentMethod: z.string().optional(),
  saleId: z.string(),
  saleNumber: z.string(),
});
export type BillResponse = z.infer<typeof billResponseSchema>;

export const startPaymentDtoSchema = z.object({
  method: z.enum(['mobile_money', 'card']),
  phoneNumber: z.string().optional(),
});
export type StartPaymentDto = z.infer<typeof startPaymentDtoSchema>;

export const startPaymentResponseSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  amount: z.number(),
  chargeAmount: z.number().optional(),
  feeAmount: z.number().optional(),
  method: z.string(),
  paymentUrl: z.string().nullable().optional(),
  state: z.enum(['pending', 'paid', 'failed', 'cancelled']),
});
export type StartPaymentResponse = z.infer<typeof startPaymentResponseSchema>;

export const paymentStatusSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  state: z.enum(['pending', 'paid', 'failed', 'cancelled']),
  message: z.string().nullable().optional(),
  amount: z.number(),
  saleId: z.string().nullable().optional(),
  saleNumber: z.string().nullable().optional(),
});
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const receiptLineSchema = z.object({
  name: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  discount: z.number().default(0),
  lineTotal: z.number(),
});

export const receiptSchema = z.object({
  business: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  orderType: z.string(),
  table: z.string().nullable().optional(),
  tabName: z.string().nullable().optional(),
  partySize: z.number().nullable().optional(),
  date: z.string(),
  lines: z.array(receiptLineSchema),
  itemsTotal: z.number(),
  serviceCharge: z.number().default(0),
  total: z.number(),
  tin: z.string().optional().default('1002948192'),
  efrisInvoiceNumber: z.string().optional().default('EFRIS-UG-2026-88192'),
  fdn: z.string().optional().default('EFRIS-UG-2026-88192'),
  qrVerificationUrl: z.string().optional().default('https://efris.ura.go.ug/verify/88192'),
});
export type Receipt = z.infer<typeof receiptSchema>;

// ==========================================
// Shifts
// ==========================================
export const openShiftDtoSchema = z.object({
  openingFloat: z.number().min(0),
});
export type OpenShiftDto = z.infer<typeof openShiftDtoSchema>;

export const closeShiftDtoSchema = z.object({
  countedCash: z.number().min(0),
  note: z.string().optional(),
});
export type CloseShiftDto = z.infer<typeof closeShiftDtoSchema>;

export const shiftSchema = z.object({
  id: z.string(),
  opened_by: z.string().optional(),
  opened_at: z.string(),
  closed_at: z.string().nullable().optional(),
  opening_float: z.number(),
  counted_cash: z.number().nullable().optional(),
  expected_cash: z.number().nullable().optional(),
  variance: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  status: z.enum(['open', 'closed']),
});
export type Shift = z.infer<typeof shiftSchema>;

export const currentShiftResponseSchema = z.object({
  open: z.boolean(),
  shift: shiftSchema.optional(),
  takings: z
    .object({
      byMethod: z.record(z.string(), z.object({ sales: z.number(), amount: z.number() })),
      total: z.number(),
      cash: z.number(),
    })
    .optional(),
  expectedCash: z.number().optional(),
});
export type CurrentShiftResponse = z.infer<typeof currentShiftResponseSchema>;

// ==========================================
// Staff & Auth
// ==========================================
export const staffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  access: z.enum(['manager', 'cashier', 'waiter', 'kitchen']),
  hasPin: z.boolean(),
  avatarUrl: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

export const setPinDtoSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be between 4 and 6 digits'),
});
export type SetPinDto = z.infer<typeof setPinDtoSchema>;

export const verifyPinDtoSchema = z.object({
  userId: z.string(),
  pin: z.string().min(4).max(6),
});
export type VerifyPinDto = z.infer<typeof verifyPinDtoSchema>;

export const verifyPinResponseSchema = z.object({
  ok: z.boolean(),
  userId: z.string(),
  name: z.string(),
  role: z.string(),
});
export type VerifyPinResponse = z.infer<typeof verifyPinResponseSchema>;

export const loginDtoSchema = z.object({
  loginId: z.string(),
  password: z.string(),
});
export type LoginDto = z.infer<typeof loginDtoSchema>;

export const pinLoginDtoSchema = z.object({
  username: z.string().min(1),
  pin: z.string().min(4).max(6),
  deviceSecret: z.string().min(32),
});
export type PinLoginDto = z.infer<typeof pinLoginDtoSchema>;

export const loginResponseSchema = z.object({
  mfaRequired: z.boolean(),
  factorId: z.string().optional(),
  mfaSession: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
    })
    .optional(),
  session: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
      tokenType: z.string(),
      expiresIn: z.number(),
      expiresAt: z.number(),
    })
    .optional(),
  user: z
    .object({
      id: z.string(),
      email: z.string(),
    })
    .optional(),
  profile: z
    .object({
      organizationId: z.string(),
      role: z.string(),
    })
    .optional(),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const meResponseSchema = z.object({
  userId: z.string(),
  name: z.string(),
  organizationId: z.string(),
  role: z.enum(['manager', 'cashier', 'waiter', 'kitchen', 'admin', 'owner']),
  permissions: z.array(z.string()),
});
export type MeResponse = z.infer<typeof meResponseSchema>;
