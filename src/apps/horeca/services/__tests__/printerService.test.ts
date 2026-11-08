import { NativeModules, Platform } from 'react-native';
import { mockBusinessProfile, mockReceipt } from '../../mock/horecaMockData';
import { calculateVatBreakdown } from '../../utils/vat';
import { EscPosBuilder, printerService, uint8ArrayToBase64 } from '../printerService';
import { usePrinterStore } from '../printerStore';

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
}));

describe('printerService & EscPosBuilder', () => {
  const mockGetPairedDevices = jest.fn();
  const mockConnect = jest.fn();
  const mockDisconnect = jest.fn();
  const mockWriteBase64 = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios'; // skip PermissionsAndroid prompt in unit test environment
    NativeModules.BluetoothPrinterModule = {
      getPairedDevices: mockGetPairedDevices,
      connect: mockConnect,
      disconnect: mockDisconnect,
      writeBase64: mockWriteBase64,
    };
    usePrinterStore.setState({
      hydrated: false,
      savedPrinter: null,
      pairedDevices: [],
      connectionState: 'disconnected',
      lastError: null,
      isModalOpen: false,
    });
  });

  it('encodes Uint8Array to Base64 accurately', () => {
    const input = new Uint8Array([0x1b, 0x40, 0x48, 0x69, 0x0a]);
    const encoded = uint8ArrayToBase64(input);
    expect(encoded).toBe('G0BIaQo=');
  });

  it('adjusts row width for 58mm (32 cols) and 80mm (48 cols) and double-width mode', () => {
    const p58 = new EscPosBuilder(58);
    p58.row('TOTAL:', 'UGX 45,000');
    const text58 = Array.from(p58.getBytes(), b => String.fromCharCode(b)).join('');
    expect(text58.trim().length).toBe(32);

    const p80 = new EscPosBuilder(80);
    p80.row('TOTAL:', 'UGX 45,000');
    const text80 = Array.from(p80.getBytes(), b => String.fromCharCode(b)).join('');
    expect(text80.trim().length).toBe(48);

    const pDouble = new EscPosBuilder(58);
    pDouble.size('double').row('TOT:', '45,000');
    // Reset 3 bytes for size('double') + 16 chars + LF
    expect(pDouble.getBytes().length).toBe(3 + 16 + 1);
  });

  it('auto-selects a single paired printer from OS Bluetooth settings and prints receipt', async () => {
    mockGetPairedDevices.mockResolvedValueOnce([
      {
        address: 'AA:BB:CC:11:22:33',
        name: 'MTP-II 58mm Printer',
        isPrinterCandidate: true,
        isConnected: false,
      },
    ]);
    mockWriteBase64.mockResolvedValueOnce(true);

    await printerService.printReceipt(mockReceipt);

    expect(mockGetPairedDevices).toHaveBeenCalledTimes(1);
    expect(mockWriteBase64).toHaveBeenCalledTimes(1);
    expect(mockWriteBase64.mock.calls[0][0]).toBe('AA:BB:CC:11:22:33');
    expect(typeof mockWriteBase64.mock.calls[0][1]).toBe('string');
    expect(usePrinterStore.getState().savedPrinter?.address).toBe('AA:BB:CC:11:22:33');
    expect(usePrinterStore.getState().connectionState).toBe('connected');
  });

  it('throws NO_PRINTER_SELECTED when multiple devices are paired and none is saved yet', async () => {
    mockGetPairedDevices.mockResolvedValueOnce([
      {
        address: 'AA:BB:CC:11:22:33',
        name: 'Kitchen Printer',
        isPrinterCandidate: true,
        isConnected: false,
      },
      {
        address: 'DD:EE:FF:44:55:66',
        name: 'Bar Printer',
        isPrinterCandidate: true,
        isConnected: false,
      },
    ]);

    await expect(printerService.printReceipt(mockReceipt)).rejects.toThrow(
      'NO_PRINTER_SELECTED',
    );
  });

  it('calculates VAT breakdown accurately for disabled, inclusive, and exclusive modes', () => {
    // 1. VAT disabled
    const disabled = calculateVatBreakdown(118000, {
      enabled: false,
      name: 'VAT',
      rate_pct: 18,
      inclusive: true,
    });
    expect(disabled.enabled).toBe(false);
    expect(disabled.vatAmount).toBe(0);
    expect(disabled.grandTotal).toBe(118000);

    // 2. VAT 18% inclusive on UGX 118,000 => Net 100,000, VAT 18,000, Total 118,000
    const inclusive = calculateVatBreakdown(118000, {
      enabled: true,
      name: 'VAT',
      rate_pct: 18,
      inclusive: true,
    });
    expect(inclusive.enabled).toBe(true);
    expect(inclusive.netAmount).toBe(100000);
    expect(inclusive.vatAmount).toBe(18000);
    expect(inclusive.grandTotal).toBe(118000);
    expect(inclusive.label).toBe('VAT');
    expect(inclusive.inclusive).toBe(true);

    // 3. VAT 18% exclusive on UGX 100,000 => Net 100,000, VAT 18,000, Total 118,000
    const exclusive = calculateVatBreakdown(100000, {
      enabled: true,
      name: 'VAT',
      rate_pct: 18,
      inclusive: false,
    });
    expect(exclusive.enabled).toBe(true);
    expect(exclusive.netAmount).toBe(100000);
    expect(exclusive.vatAmount).toBe(18000);
    expect(exclusive.grandTotal).toBe(118000);
    expect(exclusive.label).toBe('VAT');
    expect(exclusive.inclusive).toBe(false);
  });

  it('renders business branding, conditional TIN/VAT, and omits dummy EFRIS numbers in buildReceiptBytes', () => {
    // Default Magave Bar & Grill profile (vat.enabled = false, show_tin = true, tin = null)
    const bytesDefault = printerService.buildReceiptBytes(mockReceipt, 80, mockBusinessProfile);
    const textDefault = Array.from(bytesDefault, b => String.fromCharCode(b)).join('');

    expect(textDefault).toContain('MAGAVE BAR & GRILL');
    expect(textDefault).toContain('Bugolobi, Kampala');
    expect(textDefault).toContain('Tel: 0781515555');
    expect(textDefault).not.toContain('TIN:');
    expect(textDefault).not.toContain('VAT');
    expect(textDefault).not.toContain('EFRIS-UG-2026-88192');
    expect(textDefault).not.toContain('null');

    // With TIN, header_note, footer, VAT enabled, and real EFRIS FDN
    const bytesFull = printerService.buildReceiptBytes(
      { ...mockReceipt, fdn: 'FDN-REAL-99102' },
      80,
      {
        ...mockBusinessProfile,
        tin: '1009988776',
        receipt: {
          header_note: 'Welcome to Magave!',
          footer: 'See you again soon!',
          show_tin: true,
        },
        vat: {
          enabled: true,
          name: 'VAT',
          rate_pct: 18,
          inclusive: true,
        },
      },
    );
    const textFull = Array.from(bytesFull, b => String.fromCharCode(b)).join('');

    expect(textFull).toContain('TIN: 1009988776');
    expect(textFull).toContain('Welcome to Magave!');
    expect(textFull).toContain('See you again soon!');
    expect(textFull).toContain('VAT (18% incl.):');
    expect(textFull).toContain('EFRIS FDN: FDN-REAL-99102');
  });
});
