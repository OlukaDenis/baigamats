import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';
import { z } from 'zod';

export const bluetoothPrinterDeviceSchema = z.object({
  address: z.string(),
  name: z.string(),
  isPrinterCandidate: z.boolean().optional().default(true),
  isConnected: z.boolean().optional().default(false),
});
export type BluetoothPrinterDevice = z.infer<typeof bluetoothPrinterDeviceSchema>;

export const savedPrinterConfigSchema = z.object({
  address: z.string(),
  name: z.string(),
  paperWidth: z.union([z.literal(58), z.literal(80)]).default(58),
  autoPrintReceipt: z.boolean().default(false),
  autoKickDrawer: z.boolean().default(true),
});
export type SavedPrinterConfig = z.infer<typeof savedPrinterConfigSchema>;

export type PrinterConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'printing'
  | 'error';

const PRINTER_CONFIG_SERVICE = 'com.baigamats.horeca.printer.config';
const PRINTER_CONFIG_ACCOUNT = 'active_bluetooth_printer';

interface PrinterStoreState {
  hydrated: boolean;
  savedPrinter: SavedPrinterConfig | null;
  pairedDevices: BluetoothPrinterDevice[];
  connectionState: PrinterConnectionState;
  lastError: string | null;
  isModalOpen: boolean;

  hydrate: () => Promise<SavedPrinterConfig | null>;
  setSavedPrinter: (printer: Partial<SavedPrinterConfig> & { address: string; name: string }) => Promise<void>;
  updatePreferences: (prefs: Partial<Pick<SavedPrinterConfig, 'paperWidth' | 'autoPrintReceipt' | 'autoKickDrawer'>>) => Promise<void>;
  clearSavedPrinter: () => Promise<void>;
  setPairedDevices: (devices: BluetoothPrinterDevice[]) => void;
  setConnectionState: (state: PrinterConnectionState, error?: string | null) => void;
  openPrinterModal: () => void;
  closePrinterModal: () => void;
}

export const usePrinterStore = create<PrinterStoreState>((set, get) => ({
  hydrated: false,
  savedPrinter: null,
  pairedDevices: [],
  connectionState: 'disconnected',
  lastError: null,
  isModalOpen: false,

  hydrate: async () => {
    if (get().hydrated && get().savedPrinter) {
      return get().savedPrinter;
    }
    try {
      const creds = await Keychain.getGenericPassword({
        service: PRINTER_CONFIG_SERVICE,
      });
      if (creds && creds.password) {
        const parsed = savedPrinterConfigSchema.safeParse(JSON.parse(creds.password));
        if (parsed.success) {
          set({ savedPrinter: parsed.data, hydrated: true });
          return parsed.data;
        }
      }
    } catch {
      // Ignore keychain read errors
    }
    set({ hydrated: true });
    return get().savedPrinter;
  },

  setSavedPrinter: async printer => {
    const existing = get().savedPrinter;
    const nextConfig: SavedPrinterConfig = {
      address: printer.address.trim().toUpperCase(),
      name: printer.name.trim() || printer.address.trim().toUpperCase(),
      paperWidth: printer.paperWidth ?? existing?.paperWidth ?? 58,
      autoPrintReceipt: printer.autoPrintReceipt ?? existing?.autoPrintReceipt ?? false,
      autoKickDrawer: printer.autoKickDrawer ?? existing?.autoKickDrawer ?? true,
    };

    set({
      savedPrinter: nextConfig,
      lastError: null,
      hydrated: true,
    });

    try {
      await Keychain.setGenericPassword(
        PRINTER_CONFIG_ACCOUNT,
        JSON.stringify(nextConfig),
        {
          service: PRINTER_CONFIG_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    } catch {
      // Keep in-memory state if Keychain fails
    }
  },

  updatePreferences: async prefs => {
    const current = get().savedPrinter;
    if (!current) return;
    await get().setSavedPrinter({
      ...current,
      ...prefs,
    });
  },

  clearSavedPrinter: async () => {
    set({
      savedPrinter: null,
      connectionState: 'disconnected',
      lastError: null,
    });
    try {
      await Keychain.resetGenericPassword({ service: PRINTER_CONFIG_SERVICE });
    } catch {
      // Ignore
    }
  },

  setPairedDevices: pairedDevices => set({ pairedDevices }),

  setConnectionState: (connectionState, error = null) =>
    set({
      connectionState,
      lastError: error,
    }),

  openPrinterModal: () => set({ isModalOpen: true }),
  closePrinterModal: () => set({ isModalOpen: false }),
}));
