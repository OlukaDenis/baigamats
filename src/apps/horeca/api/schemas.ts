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
  warnings: z.array(z.string()).optional(),
});
export type Order = z.infer<typeof orderSchema>;

export const createOrderItemInputSchema = z.object({
  menuItemId: z.string(),
  qty: z.number().int().min(1).max(500),
  modifiers: z.array(z.string()).max(20).optional(),
  notes: z.string().max(300).optional(),
  ageVerifiedBy: z.string().optional(),
});
export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;

export const createOrderDtoSchema = z.object({
  orderType: orderTypeSchema,
  tableId: z.string().optional(),
  partySize: z.number().int().min(1).max(500).optional(),
  tabName: z.string().optional(),
  items: z.array(createOrderItemInputSchema).max(100).optional(),
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
  fdn: z.string().nullable().optional(),
  efrisInvoiceNumber: z.string().nullable().optional(),
  efrisNumber: z.string().nullable().optional(),
  fiscalNumber: z.string().nullable().optional(),
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
  fdn: z.string().nullable().optional(),
  efrisInvoiceNumber: z.string().nullable().optional(),
  efrisNumber: z.string().nullable().optional(),
  fiscalNumber: z.string().nullable().optional(),
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
  tin: z.string().nullable().optional(),
  efrisInvoiceNumber: z.string().nullable().optional(),
  efrisNumber: z.string().nullable().optional(),
  fiscalNumber: z.string().nullable().optional(),
  fdn: z.string().nullable().optional(),
  qrVerificationUrl: z.string().nullable().optional(),
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

// ==========================================
// Business Settings & VAT (GET /api/v1/business)
// ==========================================
export const businessReceiptSettingsSchema = z.object({
  header_note: z.string().nullable().optional().default(null),
  footer: z.string().nullable().optional().default(null),
  show_tin: z.boolean().optional().default(false),
});
export type BusinessReceiptSettings = z.infer<typeof businessReceiptSettingsSchema>;

export const businessVatSettingsSchema = z.object({
  enabled: z.boolean().optional().default(false),
  name: z.string().nullable().optional().transform(v => v || 'VAT'),
  rate_pct: z.coerce.number().optional().default(18),
  inclusive: z.boolean().optional().default(true),
});
export type BusinessVatSettings = z.infer<typeof businessVatSettingsSchema>;

export const businessProfileSchema = z.object({
  name: z.string().nullable().optional().default(null),
  legal_name: z.string().nullable().optional().default(null),
  institution_code: z.string().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
  email: z.string().nullable().optional().default(null),
  address: z.string().nullable().optional().default(null),
  logo_url: z.string().nullable().optional().default(null),
  currency: z.string().nullable().optional().transform(v => v || 'UGX'),
  tin: z.string().nullable().optional().default(null),
  receipt: businessReceiptSettingsSchema.nullable().optional().transform(v => v ?? {
    header_note: null,
    footer: null,
    show_tin: false,
  }),
  vat: businessVatSettingsSchema.nullable().optional().transform(v => v ?? {
    enabled: false,
    name: 'VAT',
    rate_pct: 18,
    inclusive: true,
  }),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

// ==========================================
// HORECA Manager Dashboard (GET /api/v1/horeca/dashboard)
// ==========================================
export const horecaDashboardDepartmentSchema = z.object({
  key: z.string(),
  label: z.string(),
  amount: z.coerce.number().default(0),
  pct: z.coerce.number().default(0),
});
export type HorecaDashboardDepartment = z.infer<typeof horecaDashboardDepartmentSchema>;

export const horecaDashboardServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  covers: z.coerce.number().default(0),
  sales: z.coerce.number().default(0),
});
export type HorecaDashboardServer = z.infer<typeof horecaDashboardServerSchema>;

export const horecaDashboardSchema = z.object({
  day: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  revenue: z.object({
    total: z.coerce.number().default(0),
    change_pct: z.number().nullable().optional().default(null),
  }),
  checks: z.object({
    count: z.coerce.number().default(0),
    guests: z.coerce.number().default(0),
  }),
  avg_check: z.object({
    value: z.coerce.number().default(0),
    target: z.coerce.number().default(45000),
  }),
  avg_turn_minutes: z.object({
    value: z.coerce.number().default(0),
    optimal: z.coerce.number().default(50),
  }),
  departments: z.array(horecaDashboardDepartmentSchema).default([]),
  servers: z.array(horecaDashboardServerSchema).default([]),
});
export type HorecaDashboardData = z.infer<typeof horecaDashboardSchema>;

export const horecaDashboardSettingsSchema = z.object({
  target_check: z.coerce.number().default(45000),
  optimal_turn: z.coerce.number().default(50),
});
export type HorecaDashboardSettings = z.infer<typeof horecaDashboardSettingsSchema>;

export const updateHorecaDashboardSettingsDtoSchema = z.object({
  target_check: z.number().gt(0, 'Enter an average check target above zero.'),
  optimal_turn: z.number().gt(0, 'Enter a table-turn time above zero.'),
});
export type UpdateHorecaDashboardSettingsDto = z.infer<typeof updateHorecaDashboardSettingsDtoSchema>;


