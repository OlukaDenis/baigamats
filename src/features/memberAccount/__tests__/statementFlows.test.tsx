import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '../../../theme/ThemeProvider';
import { BalanceCard } from '../components/BalanceCard';
import { StatementScreen } from '../screens/StatementScreen';
import { memberAccountKeys } from '../hooks/useMemberAccountQueries';
import type { MemberMeBalances } from '../types/memberAccountTypes';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        networkMode: 'always',
      },
    },
  });
}

describe('Member Account & Statement Flows (Phase 2)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('BalanceCard', () => {
    it('displays savings, share capital, and welfare balances in UGX', async () => {
      const mockBalances: MemberMeBalances = {
        savings: 1250000,
        shares_value: 300000,
        shares_count: 30,
        share_price: 10000,
        welfare_paid_in: 50000,
        welfare_received: 10000,
        welfare_net: 40000,
        share_interest: 12000,
        pending_withdrawals: 25000,
        fees_paid: 3500,
      };

      const onDeposit = jest.fn();
      const onWithdraw = jest.fn();
      const onTransfer = jest.fn();

      await render(
        <ThemeProvider>
          <BalanceCard
            balances={mockBalances}
            onDepositPress={onDeposit}
            onWithdrawPress={onWithdraw}
            onTransferPress={onTransfer}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText('UGX 1,250,000')).toBeOnTheScreen();
      expect(screen.getByText('UGX 300,000')).toBeOnTheScreen();
      expect(screen.getByText('UGX 40,000')).toBeOnTheScreen();
      expect(screen.getByText(/25,000 pending/i)).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: 'Deposit funds' }));
      expect(onDeposit).toHaveBeenCalled();

      fireEvent.press(screen.getByRole('button', { name: 'Withdraw funds' }));
      expect(onWithdraw).toHaveBeenCalled();

      fireEvent.press(screen.getByRole('button', { name: 'Transfer funds' }));
      expect(onTransfer).toHaveBeenCalled();
    });
  });

  describe('StatementScreen', () => {
    it('renders statement transactions and filter modal', async () => {
      const mockTransactionsResponse = {
        data: [
          {
            id: 'txn_1',
            type: 'deposit',
            label: 'Mobile Money Deposit',
            direction: 'in' as const,
            amount: 50000,
            fee: 1000,
            status: 'completed' as const,
            date: '2026-10-25',
            note: 'MTN Mobile Money',
          },
          {
            id: 'txn_2',
            type: 'withdraw',
            label: 'Withdrawal to MTN',
            direction: 'out' as const,
            amount: 20000,
            fee: 500,
            status: 'pending' as const,
            date: '2026-10-26',
            note: null,
          },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      };

      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        memberAccountKeys.infiniteTransactions({ from: undefined, to: undefined, limit: 20 }),
        {
          pages: [mockTransactionsResponse],
          pageParams: [0],
        },
      );

      await render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatementScreen />
          </ThemeProvider>
        </QueryClientProvider>,
      );

      // Verify transaction list items appear
      expect(screen.getByText('Mobile Money Deposit')).toBeOnTheScreen();
      expect(screen.getByText('+UGX 50,000')).toBeOnTheScreen();
      expect(screen.getByText('Withdrawal to MTN')).toBeOnTheScreen();
      expect(screen.getByText('-UGX 20,000')).toBeOnTheScreen();
      expect(screen.getByText('Fee: UGX 1,000')).toBeOnTheScreen();

      // Open filter dialog
      const filterButton = screen.getByRole('button', {
        name: 'Filter statement transactions',
      });
      await fireEvent.press(filterButton);

      expect(screen.getByText('Filter by Date Range')).toBeOnTheScreen();

      const fromInput = screen.getByLabelText('From Date (YYYY-MM-DD)');
      const toInput = screen.getByLabelText('To Date (YYYY-MM-DD)');

      await fireEvent.changeText(fromInput, '2026-10-01');
      await fireEvent.changeText(toInput, '2026-10-28');

      const applyButton = screen.getByRole('button', { name: 'Apply Filter' });
      await act(async () => {
        await fireEvent.press(applyButton);
      });

      // Filter chip should be visible
      expect(await screen.findByText('2026-10-01 → 2026-10-28')).toBeOnTheScreen();
    });
  });
});
