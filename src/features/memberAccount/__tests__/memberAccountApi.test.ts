import { createMemberAccountApi } from '../api/memberAccountApi';

describe('memberAccountApi (Phase 2)', () => {
  it('calls GET /member/me and parses balances correctly', async () => {
    let requestedUrl = '';
    const mockClient = {
      get: jest.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          data: {
            name: 'Sarah Nakato',
            member_no: 'M-1029',
            phone: '+256772123456',
            organization: 'Kagera SACCO',
            savings: 250000,
            shares_value: 50000,
            shares_count: 5,
            share_price: 10000,
            welfare_paid_in: 10000,
            welfare_received: 0,
            welfare_net: 10000,
            share_interest: 2500,
            pending_withdrawals: 0,
            fees_paid: 1200,
          },
        });
      }),
    };

    const api = createMemberAccountApi(mockClient as any);
    const result = await api.getMe();

    expect(requestedUrl).toBe('/member/me');
    expect(result.name).toBe('Sarah Nakato');
    expect(result.balances.savings).toBe(250000);
    expect(result.balances.shares_value).toBe(50000);
  });

  it('calls GET /member/transactions with filter query params', async () => {
    let capturedParams: any = null;
    const mockClient = {
      get: jest.fn().mockImplementation((_url: string, config?: any) => {
        capturedParams = config?.params;
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'txn_100',
                type: 'deposit',
                label: 'Savings Deposit',
                direction: 'in',
                amount: 75000,
                fee: 1000,
                status: 'completed',
                date: '2026-10-28',
              },
            ],
            total: 1,
            limit: 10,
            offset: 0,
          },
        });
      }),
    };

    const api = createMemberAccountApi(mockClient as any);
    const result = await api.getTransactions({
      limit: 10,
      offset: 0,
      from: '2026-10-01',
      to: '2026-10-28',
    });

    expect(capturedParams).toEqual({
      limit: 10,
      offset: 0,
      from: '2026-10-01',
      to: '2026-10-28',
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].amount).toBe(75000);
  });
});

