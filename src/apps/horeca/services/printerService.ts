import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { BusinessProfile, KitchenTicket, Receipt } from '../api/schemas';
import { useHorecaStore } from '../db/offlineStore';
import {
  calculateVatBreakdown,
  resolveBusinessName,
  resolvePrintableTin,
  resolveRealFiscalNumber,
} from '../utils/vat';
import {
  type BluetoothPrinterDevice,
  bluetoothPrinterDeviceSchema,
  type SavedPrinterConfig,
  usePrinterStore,
} from './printerStore';

interface NativeBluetoothPrinterModule {
  getPairedDevices(): Promise<BluetoothPrinterDevice[]>;
  connect(address: string): Promise<{ address: string; name: string; connected: boolean }>;
  disconnect(): Promise<boolean>;
  isConnected(address: string | null): Promise<boolean>;
  writeBase64(address: string, base64Payload: string): Promise<boolean>;
}

function getNativePrinterModule(): NativeBluetoothPrinterModule | undefined {
  return NativeModules.BluetoothPrinterModule as NativeBluetoothPrinterModule | undefined;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Pure TypeScript Uint8Array -> Base64 encoder (Hermes safe, no Buffer dependency required)
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;

  while (i < len) {
    const b1 = bytes[i++] ?? 0;
    const hasB2 = i < len;
    const b2 = hasB2 ? (bytes[i++] ?? 0) : 0;
    const hasB3 = i < len;
    const b3 = hasB3 ? (bytes[i++] ?? 0) : 0;

    const triplet = (b1 << 16) | (b2 << 8) | b3;

    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += hasB2 ? BASE64_CHARS[(triplet >> 6) & 0x3f] : '=';
    result += hasB3 ? BASE64_CHARS[triplet & 0x3f] : '=';
  }

  return result;
}

/**
 * ESC/POS Thermal Printing Command Builder
 * Formats byte buffers and standard ESC/POS command sequences for 58mm (32 cols) & 80mm (48 cols)
 * thermal printers via Bluetooth SPP / BLE or Network sockets.
 */
export class EscPosBuilder {
  private buffer: number[] = [];
  private readonly lineWidth: number;
  private isDoubleWidth = false;

  constructor(paperWidth: 58 | 80 = 58) {
    this.lineWidth = paperWidth === 80 ? 48 : 32;
  }

  // Reset printer to defaults
  init(): this {
    this.buffer.push(0x1b, 0x40);
    this.isDoubleWidth = false;
    return this;
  }

  // Text Alignment: 0 = Left, 1 = Center, 2 = Right
  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, val);
    return this;
  }

  // Bold Text
  bold(enabled = true): this {
    this.buffer.push(0x1b, 0x45, enabled ? 1 : 0);
    return this;
  }

  // Text Size: 0 = Normal, 1 = Double Height, 2 = Double Width, 3 = Double Both
  size(mode: 'normal' | 'double-height' | 'double-width' | 'double'): this {
    let val = 0x00;
    if (mode === 'double-height') val = 0x01;
    if (mode === 'double-width') val = 0x10;
    if (mode === 'double') val = 0x11;
    this.isDoubleWidth = mode === 'double-width' || mode === 'double';
    this.buffer.push(0x1d, 0x21, val);
    return this;
  }

  // Append raw ASCII-safe text string (normalizes non-ASCII punctuation to prevent garbled glyphs)
  text(str: string): this {
    const sanitized = str
      .replace(/[•·]/g, '-')
      .replace(/[—–]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    for (let i = 0; i < sanitized.length; i++) {
      const code = sanitized.charCodeAt(i);
      this.buffer.push(code >= 32 && code <= 126 ? code : 0x3f);
    }
    return this;
  }

  // Append text followed by line feed
  line(str = ''): this {
    this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  // Divider Line
  divider(char = '-', length?: number): this {
    const effectiveCols = length ?? (this.isDoubleWidth ? Math.floor(this.lineWidth / 2) : this.lineWidth);
    return this.line(char.repeat(Math.max(1, effectiveCols)));
  }

  // Two Column Row (Left aligned label, Right aligned value, padded to effective width)
  row(left: string, right: string, width?: number): this {
    const effectiveCols =
      width ?? (this.isDoubleWidth ? Math.floor(this.lineWidth / 2) : this.lineWidth);
    const maxLeftLen = Math.max(1, effectiveCols - right.length - 1);
    const trimmedLeft =
      left.length > maxLeftLen ? `${left.slice(0, Math.max(1, maxLeftLen - 1))}` : left;
    const spaces = Math.max(1, effectiveCols - trimmedLeft.length - right.length);
    return this.line(trimmedLeft + ' '.repeat(spaces) + right);
  }

  // Cash Drawer Kick Pulse (Standard ESC p 0 25 250)
  pulseDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  // Feed lines and partial paper cut
  cut(): this {
    this.buffer.push(0x0a, 0x0a, 0x0a);
    this.buffer.push(0x1d, 0x56, 0x01); // Full/partial cut
    return this;
  }

  // Export byte array
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export const printerService = {
  /**
   * Request Android 12+ (API 31+) BLUETOOTH_CONNECT & BLUETOOTH_SCAN runtime permissions
   * or legacy location permission on older Android versions.
   */
  async ensureBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

    if (apiLevel >= 31) {
      const connectPerm = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
      const scanPerm = PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN;

      const hasConnect = await PermissionsAndroid.check(connectPerm);
      if (hasConnect) {
        return true;
      }

      const results = await PermissionsAndroid.requestMultiple([connectPerm, scanPerm]);
      return results[connectPerm] === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  },

  /**
   * Queries paired (bonded) Bluetooth devices from the OS Bluetooth adapter.
   * Prioritizes thermal printer candidates at the top of the list.
   */
  async getPairedPrinters(): Promise<BluetoothPrinterDevice[]> {
    const hasPerm = await this.ensureBluetoothPermissions();
    if (!hasPerm) {
      throw new Error(
        'Bluetooth permission was denied. Please allow Nearby Devices / Bluetooth permission in Android Settings.',
      );
    }

    const nativePrinterModule = getNativePrinterModule();
    if (!nativePrinterModule) {
      throw new Error(
        'Native Bluetooth printer driver is not linked in this build. Please rebuild the Android app.',
      );
    }

    const rawDevices = await nativePrinterModule.getPairedDevices();
    const parsed = rawDevices
      .map(d => bluetoothPrinterDeviceSchema.safeParse(d))
      .filter((r): r is { success: true; data: BluetoothPrinterDevice } => r.success)
      .map(r => r.data);

    // Sort printer candidates first, then connected status, then alphabetically
    parsed.sort((a, b) => {
      if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1;
      if (a.isPrinterCandidate !== b.isPrinterCandidate) return a.isPrinterCandidate ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    usePrinterStore.getState().setPairedDevices(parsed);
    return parsed;
  },

  /**
   * Resolves the target Bluetooth printer:
   * 1. Hydrates any previously saved printer from Keychain/store.
   * 2. If none is saved yet, queries OS paired devices and auto-selects if exactly one
   *    printer candidate is already paired in Android Bluetooth settings.
   */
  async resolveActivePrinter(): Promise<SavedPrinterConfig | null> {
    const store = usePrinterStore.getState();
    const hydrated = await store.hydrate();
    if (hydrated?.address) {
      return hydrated;
    }

    const paired = await this.getPairedPrinters();
    if (paired.length === 0) {
      return null;
    }

    // If the user has already paired a single printer in OS Bluetooth settings, auto-bind it!
    const candidates = paired.filter(d => d.isPrinterCandidate);
    if (candidates.length === 1) {
      await store.setSavedPrinter({
        address: candidates[0].address,
        name: candidates[0].name,
      });
      return usePrinterStore.getState().savedPrinter;
    }

    if (paired.length === 1) {
      await store.setSavedPrinter({
        address: paired[0].address,
        name: paired[0].name,
      });
      return usePrinterStore.getState().savedPrinter;
    }

    return null;
  },

  /**
   * Explicitly connects to a Bluetooth printer by MAC address and persists it as the active printer.
   */
  async connectPrinter(device: { address: string; name: string; paperWidth?: 58 | 80 }): Promise<void> {
    const store = usePrinterStore.getState();
    const hasPerm = await this.ensureBluetoothPermissions();
    if (!hasPerm) {
      const msg = 'Bluetooth permission is required to connect to the printer.';
      store.setConnectionState('error', msg);
      throw new Error(msg);
    }

    const nativePrinterModule = getNativePrinterModule();
    if (!nativePrinterModule) {
      const msg = 'Native Bluetooth printer driver is not available.';
      store.setConnectionState('error', msg);
      throw new Error(msg);
    }

    store.setConnectionState('connecting', null);
    try {
      const res = await nativePrinterModule.connect(device.address);
      await store.setSavedPrinter({
        address: res.address || device.address,
        name: device.name || res.name || device.address,
        paperWidth: device.paperWidth,
      });
      store.setConnectionState('connected', null);
    } catch (err: any) {
      const msg = err?.message || 'Could not connect to the selected Bluetooth printer.';
      store.setConnectionState('error', msg);
      throw new Error(msg);
    }
  },

  /**
   * Disconnects the active RFCOMM Bluetooth socket.
   */
  async disconnectPrinter(): Promise<void> {
    const nativePrinterModule = getNativePrinterModule();
    if (nativePrinterModule) {
      await nativePrinterModule.disconnect().catch(() => {});
    }
    usePrinterStore.getState().setConnectionState('disconnected', null);
  },

  /**
   * Sends raw ESC/POS bytes to the active (or specified) Bluetooth printer.
   * Opens/reconnects the RFCOMM socket automatically if idle and streams in 256-byte chunks.
   */
  async sendRawBytes(bytes: Uint8Array, targetAddress?: string): Promise<void> {
    const store = usePrinterStore.getState();
    const hasPerm = await this.ensureBluetoothPermissions();
    if (!hasPerm) {
      const msg = 'Bluetooth permission is required to print receipts.';
      store.setConnectionState('error', msg);
      throw new Error(msg);
    }

    const nativePrinterModule = getNativePrinterModule();
    if (!nativePrinterModule) {
      const msg = 'Native Bluetooth printer driver is unavailable. Please rebuild the Android app.';
      store.setConnectionState('error', msg);
      throw new Error(msg);
    }

    let address = targetAddress;
    if (!address) {
      const resolved = await this.resolveActivePrinter();
      address = resolved?.address;
    }

    if (!address) {
      const err = new Error('NO_PRINTER_SELECTED');
      (err as any).code = 'NO_PRINTER_SELECTED';
      throw err;
    }

    store.setConnectionState('printing', null);
    try {
      const base64Payload = uint8ArrayToBase64(bytes);
      await nativePrinterModule.writeBase64(address, base64Payload);
      store.setConnectionState('connected', null);
    } catch (err: any) {
      const msg =
        err?.message ||
        'Failed to communicate with the Bluetooth printer. Verify it is turned on and within range.';
      store.setConnectionState('error', msg);
      throw new Error(msg);
    }
  },

  /**
   * Formats and prints a customer receipt on the connected Bluetooth ESC/POS thermal printer.
   */
  async printReceipt(
    receipt: Receipt,
    options?: { kickDrawer?: boolean; address?: string; businessProfile?: BusinessProfile | null },
  ): Promise<void> {
    const store = usePrinterStore.getState();
    const saved = await store.hydrate();
    const paperWidth = saved?.paperWidth ?? 58;
    const receiptBytes = this.buildReceiptBytes(
      receipt,
      paperWidth,
      options?.businessProfile,
    );

    if (options?.kickDrawer) {
      const drawerBytes = this.buildDrawerKickBytes();
      const combined = new Uint8Array(drawerBytes.length + receiptBytes.length);
      combined.set(drawerBytes, 0);
      combined.set(receiptBytes, drawerBytes.length);
      await this.sendRawBytes(combined, options.address);
      return;
    }

    await this.sendRawBytes(receiptBytes, options?.address);
  },

  /**
   * Formats and prints a Kitchen Order Ticket (KOT) chit.
   */
  async printKot(ticket: KitchenTicket, address?: string): Promise<void> {
    const saved = await usePrinterStore.getState().hydrate();
    const paperWidth = saved?.paperWidth ?? 58;
    const bytes = this.buildKotBytes(ticket, paperWidth);
    await this.sendRawBytes(bytes, address);
  },

  /**
   * Sends a Cash Drawer Kick pulse to the connected printer's RJ11 port.
   */
  async kickCashDrawer(address?: string): Promise<void> {
    const bytes = this.buildDrawerKickBytes();
    await this.sendRawBytes(bytes, address);
  },

  /**
   * Prints a self-test slip to verify Bluetooth connectivity and paper alignment.
   */
  async printTestSlip(address?: string): Promise<void> {
    const saved = await usePrinterStore.getState().hydrate();
    const paperWidth = saved?.paperWidth ?? 58;
    const printerName = saved?.name ?? 'Bluetooth ESC/POS Printer';
    const printerMac = address ?? saved?.address ?? 'N/A';

    const p = new EscPosBuilder(paperWidth);
    p.init()
      .align('center')
      .size('double')
      .bold(true)
      .line('BAIGAMATS POS')
      .size('normal')
      .bold(false)
      .line('Bluetooth Thermal Printer Test')
      .divider('=')
      .align('left')
      .row('Printer:', printerName)
      .row('MAC Address:', printerMac)
      .row('Paper Width:', `${paperWidth}mm (${paperWidth === 80 ? 48 : 32} cols)`)
      .row('Time:', new Date().toLocaleTimeString())
      .divider('-')
      .align('center')
      .bold(true)
      .line('CONNECTION VERIFIED OK')
      .bold(false)
      .line('Ready to print fiscal receipts.')
      .cut();

    await this.sendRawBytes(p.getBytes(), address);
  },

  /**
   * Generates formatted thermal receipt ESC/POS payload
   */
  buildReceiptBytes(
    receipt: Receipt,
    paperWidth: 58 | 80 = 58,
    explicitBusinessProfile?: BusinessProfile | null,
  ): Uint8Array {
    const p = new EscPosBuilder(paperWidth);
    const businessProfile =
      explicitBusinessProfile !== undefined
        ? explicitBusinessProfile
        : useHorecaStore.getState().businessProfile;

    const businessName = resolveBusinessName(businessProfile, receipt.business);
    const address = businessProfile?.address?.trim() || null;
    const phone = businessProfile?.phone?.trim() || null;
    const email = businessProfile?.email?.trim() || null;
    const printableTin = resolvePrintableTin(businessProfile);
    const headerNote = businessProfile?.receipt?.header_note?.trim() || null;
    const footerNote = businessProfile?.receipt?.footer?.trim() || null;
    const realFiscalNumber = resolveRealFiscalNumber(receipt);
    const vat = calculateVatBreakdown(receipt.total, businessProfile?.vat);

    p.init().align('center');

    if (businessName) {
      p.size('double').bold(true).line(businessName).size('normal').bold(false);
    }

    if (address) {
      p.line(address);
    }
    if (phone) {
      p.line(`Tel: ${phone}`);
    }
    if (email) {
      p.line(email);
    }
    if (printableTin) {
      p.line(`TIN: ${printableTin}`);
    }
    if (headerNote) {
      p.line(headerNote);
    }
    if (realFiscalNumber) {
      p.line(`FDN: ${realFiscalNumber}`);
    }

    p.divider('=')
      .align('left')
      .row('Order No:', receipt.orderNumber)
      .row('Table / Type:', `${receipt.table || 'Walk-in'} (${receipt.orderType})`)
      .row(
        'Date:',
        new Date(receipt.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      )
      .divider('-')
      .row('ITEM', 'AMOUNT (UGX)')
      .divider('-');

    // Line items
    for (const item of receipt.lines) {
      p.row(`${item.qty}x ${item.name}`, Math.round(item.lineTotal).toLocaleString());
    }

    p.divider('-');

    if (vat.enabled) {
      p.row('Subtotal:', `UGX ${vat.netAmount.toLocaleString()}`)
        .row(
          `${vat.label} (${vat.ratePct}%${vat.inclusive ? ' Incl.' : ''}):`,
          `UGX ${vat.vatAmount.toLocaleString()}`,
        )
        .divider('=');
    }

    p.bold(true)
      .size('double-height')
      .row('TOTAL:', `UGX ${vat.grandTotal.toLocaleString()}`)
      .size('normal')
      .bold(false)
      .divider('=')
      .align('center');

    if (realFiscalNumber) {
      p.line('*** PAID - FISCAL INVOICE ***');
    } else {
      p.line('*** PAID RECEIPT ***');
    }

    if (footerNote) {
      p.line(footerNote);
    }

    p.cut();

    return p.getBytes();
  },

  /**
   * Generates formatted Kitchen Order Ticket (KOT) chit
   */
  buildKotBytes(ticket: KitchenTicket, paperWidth: 58 | 80 = 58): Uint8Array {
    const p = new EscPosBuilder(paperWidth);

    p.init()
      .align('center')
      .size('double')
      .bold(true)
      .line(`*** ${ticket.station.toUpperCase()} TICKET ***`)
      .size('normal')
      .bold(false)
      .divider('=')
      .align('left')
      .size('double-height')
      .line(`Table: ${ticket.order.table_id || 'Tab'}`)
      .line(`Order: ${ticket.order.order_number}`)
      .size('normal')
      .line(`Time: ${new Date(ticket.created_at).toLocaleTimeString()}`)
      .divider('-')
      .size('double')
      .bold(true)
      .line(`${ticket.qty}x ${ticket.item_name}`)
      .size('normal')
      .bold(false);

    if (ticket.modifiers && ticket.modifiers.length > 0) {
      p.line(`  Modifiers: ${ticket.modifiers.join(', ')}`);
    }

    if (ticket.notes) {
      p.bold(true).line(`  NOTE: ${ticket.notes}`).bold(false);
    }

    p.divider('-')
      .align('center')
      .line('*** FIRE TO PREPARATION ***')
      .cut();

    return p.getBytes();
  },

  /**
   * Generates Cash Drawer Kick ESC/POS pulse
   */
  buildDrawerKickBytes(): Uint8Array {
    return new EscPosBuilder().init().pulseDrawer().getBytes();
  },
};
