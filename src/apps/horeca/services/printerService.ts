import type { KitchenTicket, Receipt } from '../api/schemas';

/**
 * ESC/POS Thermal Printing Command Builder
 * Formats byte buffers and standard ESC/POS command sequences for 58mm & 80mm thermal printers
 * via Bluetooth SPP / BLE or Network sockets.
 */
export class EscPosBuilder {
  private buffer: number[] = [];

  // Reset printer to defaults
  init(): this {
    this.buffer.push(0x1b, 0x40);
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
    this.buffer.push(0x1d, 0x21, val);
    return this;
  }

  // Append raw text string
  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
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
  divider(char = '-', length = 32): this {
    return this.line(char.repeat(length));
  }

  // Two Column Row (Left aligned label, Right aligned value, padded to width)
  row(left: string, right: string, width = 32): this {
    const spaces = Math.max(1, width - left.length - right.length);
    return this.line(left + ' '.repeat(spaces) + right);
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
   * Generates formatted thermal receipt ESC/POS payload
   */
  buildReceiptBytes(receipt: Receipt): Uint8Array {
    const p = new EscPosBuilder();

    p.init()
      .align('center')
      .size('double')
      .bold(true)
      .line(receipt.business)
      .size('normal')
      .bold(false)
      .line('Kampala, Uganda')
      .line('Tel: +256 772 000 111')
      .line(`TIN: ${receipt.tin || '1002948192'}`)
      .line(`EFRIS: ${receipt.efrisInvoiceNumber || 'EFRIS-UG-2026-88192'}`)
      .divider('=')
      .align('left')
      .row('Order No:', receipt.orderNumber)
      .row('Table / Type:', `${receipt.table || 'Walk-in'} (${receipt.orderType})`)
      .row('Date:', new Date(receipt.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }))
      .row('Server:', 'Alex K.')
      .divider('-')
      .row('ITEM', 'AMOUNT (UGX)')
      .divider('-');

    // Line items
    for (const item of receipt.lines) {
      p.row(`${item.qty}x ${item.name}`, item.lineTotal.toLocaleString());
    }

    p.divider('-')
      .row('Subtotal:', `${receipt.itemsTotal.toLocaleString()} UGX`)
      .row('VAT (18%):', `${Math.round(receipt.itemsTotal * 0.18).toLocaleString()} UGX`)
      .divider('=')
      .bold(true)
      .size('double')
      .row('TOTAL:', `${receipt.total.toLocaleString()} UGX`)
      .size('normal')
      .bold(false)
      .divider('=')
      .align('center')
      .line('*** PAID - FISCAL INVOICE ***')
      .line('Scan QR on display to verify with URA')
      .line('Thank you for dining with us!')
      .cut();

    return p.getBytes();
  },

  /**
   * Generates formatted Kitchen Order Ticket (KOT) chit
   */
  buildKotBytes(ticket: KitchenTicket): Uint8Array {
    const p = new EscPosBuilder();

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
      .line(`${ticket.qty}x  ${ticket.item_name}`)
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
