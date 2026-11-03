import {
  memberMeResponseSchema,
  memberTransactionSchema,
  memberTransactionsResponseSchema,
  transactionFilterSchema,
} from '../schemas/memberAccountSchemas';

describe('memberAccountSchemas (Phase 2)', () => {
  describe('memberMeResponseSchema', () => {
    it('parses flattened balance response correctly', () => {
      const raw = {
        name: 'Sarah Nakato',
        member_no: 'M-1029',
        phone: '+256772123456',
        organization: {
          id: 'org_1',
          name: 'Kagera Farmers SACCO',
          slug: 'kagera-sacco',
        },
        savings: 1500000,
        shares_value: 300000,
        shares_count: 30,
        share_price: 10000,
        welfare_paid_in: 50000,
        welfare_received: 0,
        welfare_net: 50000,
        share_interest: 15000,
        pending_withdrawals: 20000,
        fees_paid: 4500,
      };

      const parsed = memberMeResponseSchema.parse(raw);
      expect(parsed.name).toBe('Sarah Nakato');
      expect(parsed.organizationName).toBe('Kagera Farmers SACCO');
      expect(parsed.balances.savings).toBe(1500000);
      expect(parsed.balances.shares_value).toBe(300000);
      expect(parsed.balances.shares_count).toBe(30);
      expect(parsed.balances.share_price).toBe(10000);
      expect(parsed.balances.welfare_net).toBe(50000);
      expect(parsed.balances.pending_withdrawals).toBe(20000);
      expect(parsed.balances.fees_paid).toBe(4500);
    });

    it('parses nested balances structure gracefully with defaults', () => {
      const raw = {
        name: 'John Doe',
        member_no: 'M-001',
        phone: '0700000000',
        organization: 'Kampala Traders SACCO',
        balances: {
          savings: 500000,
        },
      };

      const parsed = memberMeResponseSchema.parse(raw);
      expect(parsed.organizationName).toBe('Kampala Traders SACCO');
      expect(parsed.balances.savings).toBe(500000);
      expect(parsed.balances.shares_value).toBe(0);
      expect(parsed.balances.welfare_net).toBe(0);
    });
  });

  describe('memberTransactionSchema', () => {
    it('validates a deposit transaction row', () => {
      const raw = {
        id: 'txn_1',
        type: 'deposit',
        label: 'Mobile Money Deposit',
        direction: 'in',
        amount: 100000,
        fee: 1000,
        status: 'completed',
        date: '2026-10-25 14:30',
        note: 'Deposit via MTN',
      };

      const parsed = memberTransactionSchema.parse(raw);
      expect(parsed.id).toBe('txn_1');
      expect(parsed.direction).toBe('in');
      expect(parsed.amount).toBe(100000);
      expect(parsed.fee).toBe(1000);
      expect(parsed.status).toBe('completed');
    });

    it('validates a pending withdrawal with default status and fee', () => {
      const raw = {
        id: 'txn_2',
        type: 'withdraw',
        label: 'Withdrawal to MTN',
        direction: 'out',
        amount: 50000,
        status: 'pending',
        date: '2026-10-26 09:15',
      };

      const parsed = memberTransactionSchema.parse(raw);
      expect(parsed.status).toBe('pending');
      expect(parsed.fee).toBe(0);
      expect(parsed.direction).toBe('out');
    });
  });

  describe('memberTransactionsResponseSchema', () => {
    it('validates paginated list shape', () => {
      const response = {
        data: [
          {
            id: 'txn_1',
            type: 'deposit',
            label: 'Deposit',
            direction: 'in',
            amount: 25000,
            date: '2026-10-20',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };

      const parsed = memberTransactionsResponseSchema.parse(response);
      expect(parsed.data).toHaveLength(1);
      expect(parsed.total).toBe(1);
      expect(parsed.limit).toBe(20);
    });
  });

  describe('transactionFilterSchema', () => {
    it('validates YYYY-MM-DD date range format', () => {
      const filter = {
        from: '2026-01-01',
        to: '2026-10-29',
        limit: 50,
        offset: 10,
      };

      const parsed = transactionFilterSchema.parse(filter);
      expect(parsed.from).toBe('2026-01-01');
      expect(parsed.to).toBe('2026-10-29');
      expect(parsed.limit).toBe(50);
      expect(parsed.offset).toBe(10);
    });

    it('rejects invalid date format', () => {
      expect(transactionFilterSchema.safeParse({ from: '01/01/2026' }).success).toBe(false);
      expect(transactionFilterSchema.safeParse({ to: 'not-a-date' }).success).toBe(false);
    });
  });
});

