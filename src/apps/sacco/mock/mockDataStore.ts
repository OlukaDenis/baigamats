import type {
  MemberMeBalances,
  MemberTransaction,
} from '../features/memberAccount/types/memberAccountTypes';
import type { LoanDetail, LoanItem } from '../features/loans/types/loanTypes';
import type { MemberInfo, OrganizationInfo } from '../features/auth/types/memberAuthTypes';

export type MockBeneficiary = {
  id: string;
  label?: string | null;
  phone_masked: string;
  usable: boolean;
  usable_from?: string | null;
  raw_phone: string;
};

export const INITIAL_MOCK_MEMBER: MemberInfo = {
  id: 'mem-1049',
  member_no: 'M-1049',
  name: 'Denis Oluka',
  phone: '+256700000001',
  organization_id: 'org-kagera-sacco',
};

export const INITIAL_MOCK_ORGANIZATION: OrganizationInfo = {
  id: 'org-kagera-sacco',
  name: 'Kagera Farmers SACCO Ltd',
  slug: 'kagera-sacco',
};

export const INITIAL_MOCK_BALANCES: MemberMeBalances = {
  savings: 2_450_000,
  pending_withdrawals: 50_000,
  shares_count: 50,
  share_price: 20_000,
  shares_value: 1_000_000,
  share_interest: 45_000,
  welfare_paid_in: 120_000,
  welfare_received: 0,
  welfare_net: 120_000,
  fees_paid: 18_500,
};

export const INITIAL_MOCK_TRANSACTIONS: MemberTransaction[] = [
  {
    id: 'txn-001',
    type: 'deposit',
    label: 'MTN Mobile Money Deposit',
    direction: 'in',
    amount: 250_000,
    fee: 1_500,
    status: 'completed',
    date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    note: 'Ref: MTN-89104192',
  },
  {
    id: 'txn-002',
    type: 'repay',
    label: 'Loan Repayment (BDEV-001)',
    direction: 'out',
    amount: 160_000,
    fee: 0,
    status: 'completed',
    date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    note: 'Installment #3 of 6',
  },
  {
    id: 'txn-003',
    type: 'withdraw',
    label: 'Cash Out to 077****456',
    direction: 'out',
    amount: 100_000,
    fee: 2_000,
    status: 'completed',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    note: 'Approved via SMS OTP',
  },
  {
    id: 'txn-004',
    type: 'to_shares',
    label: 'Purchased 5 Shares',
    direction: 'out',
    amount: 100_000,
    fee: 1_000,
    shares: 5,
    status: 'completed',
    date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    note: '5 shares @ UGX 20,000',
  },
  {
    id: 'txn-005',
    type: 'to_welfare',
    label: 'Monthly Welfare Contribution',
    direction: 'out',
    amount: 20_000,
    fee: 500,
    status: 'completed',
    date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    note: 'October 2026 Welfare Contribution',
  },
  {
    id: 'txn-006',
    type: 'to_member',
    label: 'Transfer to Member M-2018 (Sarah K.)',
    direction: 'out',
    amount: 75_000,
    fee: 1_000,
    status: 'completed',
    date: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    note: 'Cooperative support fund',
  },
  {
    id: 'txn-007',
    type: 'deposit',
    label: 'Airtel Money Deposit',
    direction: 'in',
    amount: 500_000,
    fee: 2_500,
    status: 'completed',
    date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    note: 'Crop harvest proceeds',
  },
];

export const INITIAL_MOCK_BENEFICIARIES: MockBeneficiary[] = [
  {
    id: 'ben-001',
    label: 'MTN Personal',
    phone_masked: '077****456',
    usable: true,
    usable_from: null,
    raw_phone: '+256772123456',
  },
  {
    id: 'ben-002',
    label: 'Airtel Business',
    phone_masked: '070****654',
    usable: false,
    usable_from: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    raw_phone: '+256701987654',
  },
];

export const INITIAL_MOCK_LOANS: LoanItem[] = [
  {
    id: 'loan-bdev-001',
    reference: 'LN-2026-0042',
    type: 'Business Development Loan',
    status: 'active',
    borrowed: 2_500_000,
    total_to_repay: 2_800_000,
    paid: 2_160_000,
    late_fees: 0,
    balance_due: 640_000,
    issued: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-07-15',
    due: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-11-10',
  },
  {
    id: 'loan-schl-002',
    reference: 'LN-2026-0019',
    type: 'School Fees Emergency Loan',
    status: 'overdue',
    borrowed: 800_000,
    total_to_repay: 880_000,
    paid: 560_000,
    late_fees: 5_000,
    balance_due: 325_000,
    issued: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-08-20',
    due: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-10-25',
  },
  {
    id: 'loan-agri-003',
    reference: 'LN-2025-0112',
    type: 'Agriculture Input Facility',
    status: 'closed',
    borrowed: 1_500_000,
    total_to_repay: 1_650_000,
    paid: 1_650_000,
    late_fees: 0,
    balance_due: 0,
    issued: '2025-09-01',
    due: '2026-03-01',
  },
];

export const INITIAL_MOCK_LOAN_DETAILS: Record<string, LoanDetail> = {
  'loan-bdev-001': {
    id: 'loan-bdev-001',
    reference: 'LN-2026-0042',
    type: 'Business Development Loan',
    status: 'active',
    borrowed: 2_500_000,
    total_to_repay: 2_800_000,
    paid: 2_160_000,
    late_fees: 0,
    balance_due: 640_000,
    issued: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-07-15',
    due: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-11-10',
    repayments: [
      {
        date: new Date(Date.now() - 78 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-08-10',
        amount: 466_667,
        method: 'savings',
        balance_after: 2_333_333,
      },
      {
        date: new Date(Date.now() - 48 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-09-10',
        amount: 466_667,
        method: 'savings',
        balance_after: 1_866_666,
      },
      {
        date: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-10-10',
        amount: 466_667,
        method: 'savings',
        balance_after: 1_400_000,
      },
    ],
  },
  'loan-schl-002': {
    id: 'loan-schl-002',
    reference: 'LN-2026-0019',
    type: 'School Fees Emergency Loan',
    status: 'overdue',
    borrowed: 800_000,
    total_to_repay: 880_000,
    paid: 560_000,
    late_fees: 5_000,
    balance_due: 325_000,
    issued: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-08-20',
    due: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-10-25',
    repayments: [
      {
        date: new Date(Date.now() - 34 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-09-25',
        amount: 293_334,
        method: 'savings',
        balance_after: 586_666,
      },
      {
        date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0] || '2026-10-25',
        amount: 266_666,
        method: 'savings',
        balance_after: 325_000,
      },
    ],
  },
};

/** Stateful mutable in-memory database for testing the member flow */
class MockDataStore {
  member = { ...INITIAL_MOCK_MEMBER };
  organization = { ...INITIAL_MOCK_ORGANIZATION };
  balances = { ...INITIAL_MOCK_BALANCES };
  transactions = [...INITIAL_MOCK_TRANSACTIONS];
  beneficiaries = [...INITIAL_MOCK_BENEFICIARIES];
  loans = INITIAL_MOCK_LOANS.map(l => ({ ...l }));
  loanDetails = { ...INITIAL_MOCK_LOAN_DETAILS };

  reset() {
    this.member = { ...INITIAL_MOCK_MEMBER };
    this.organization = { ...INITIAL_MOCK_ORGANIZATION };
    this.balances = { ...INITIAL_MOCK_BALANCES };
    this.transactions = [...INITIAL_MOCK_TRANSACTIONS];
    this.beneficiaries = [...INITIAL_MOCK_BENEFICIARIES];
    this.loans = INITIAL_MOCK_LOANS.map(l => ({ ...l }));
    this.loanDetails = { ...INITIAL_MOCK_LOAN_DETAILS };
  }

  applyDeposit(amount: number, phone: string): string {
    const txnId = `txn-dep-${Date.now()}`;
    const fee = 1_000;
    this.balances.savings += amount;
    this.balances.fees_paid += fee;

    const newTxn: MemberTransaction = {
      id: txnId,
      type: 'deposit',
      label: `Mobile Money Deposit (${phone})`,
      direction: 'in',
      amount,
      fee,
      status: 'completed',
      date: new Date().toISOString(),
      note: 'Test Mock Deposit Approved',
    };

    this.transactions.unshift(newTxn);
    return txnId;
  }

  applyWithdrawal(amount: number, fee: number, phone: string): string {
    const txnId = `txn-wth-${Date.now()}`;
    this.balances.savings -= amount + fee;
    this.balances.fees_paid += fee;

    const newTxn: MemberTransaction = {
      id: txnId,
      type: 'withdraw',
      label: `Cash Out to ${phone}`,
      direction: 'out',
      amount,
      fee,
      status: 'completed',
      date: new Date().toISOString(),
      note: 'Test Mock Withdrawal Approved',
    };

    this.transactions.unshift(newTxn);
    return txnId;
  }

  applyTransferToMember(amount: number, fee: number, targetMember: string): string {
    const txnId = `txn-trf-${Date.now()}`;
    this.balances.savings -= amount + fee;
    this.balances.fees_paid += fee;

    const newTxn: MemberTransaction = {
      id: txnId,
      type: 'to_member',
      label: `Transfer to Member ${targetMember}`,
      direction: 'out',
      amount,
      fee,
      status: 'completed',
      date: new Date().toISOString(),
      note: 'Member-to-member P2P transfer',
    };

    this.transactions.unshift(newTxn);
    return txnId;
  }

  applySharesPurchase(amount: number, fee: number): string {
    const txnId = `txn-shr-${Date.now()}`;
    const sharePrice = this.balances.share_price || 20_000;
    const additionalShares = Math.max(1, Math.floor(amount / sharePrice));

    this.balances.savings -= amount + fee;
    this.balances.fees_paid += fee;
    this.balances.shares_count += additionalShares;
    this.balances.shares_value += additionalShares * sharePrice;

    const newTxn: MemberTransaction = {
      id: txnId,
      type: 'to_shares',
      label: `Purchased ${additionalShares} Shares`,
      direction: 'out',
      amount,
      fee,
      shares: additionalShares,
      status: 'completed',
      date: new Date().toISOString(),
      note: `${additionalShares} shares @ UGX ${sharePrice}`,
    };

    this.transactions.unshift(newTxn);
    return txnId;
  }

  applyWelfareContribution(amount: number, fee: number): string {
    const txnId = `txn-wlf-${Date.now()}`;
    this.balances.savings -= amount + fee;
    this.balances.fees_paid += fee;
    this.balances.welfare_paid_in += amount;
    this.balances.welfare_net += amount;

    const newTxn: MemberTransaction = {
      id: txnId,
      type: 'to_welfare',
      label: 'Welfare Fund Top-up',
      direction: 'out',
      amount,
      fee,
      status: 'completed',
      date: new Date().toISOString(),
      note: 'Voluntary Welfare Contribution',
    };

    this.transactions.unshift(newTxn);
    return txnId;
  }

  applyLoanRepayment(loanId: string, amount: number): { receipt: string; newBalance: number } {
    const txnId = `txn-rpy-${Date.now()}`;
    const receipt = `RPY-${Math.floor(100_000 + Math.random() * 900_000)}`;

    this.balances.savings -= amount;

    const loan = this.loans.find(l => l.id === loanId);
    let newBalance = 0;
    if (loan) {
      loan.balance_due = Math.max(0, loan.balance_due - amount);
      loan.paid += amount;
      if (loan.balance_due === 0) {
        loan.status = 'closed';
      }
      newBalance = loan.balance_due;
    }

    const detail = this.loanDetails[loanId];
    if (detail) {
      detail.balance_due = newBalance;
      detail.paid += amount;
      if (newBalance === 0) {
        detail.status = 'closed';
      }
      detail.repayments.unshift({
        date: new Date().toISOString().split('T')[0] || '2026-10-30',
        amount,
        method: 'savings',
        balance_after: newBalance,
      });
    }

    const newTxn: MemberTransaction = {
      id: txnId,
      type: 'repay',
      label: `Loan Repayment (${loan?.type || loanId})`,
      direction: 'out',
      amount,
      fee: 0,
      status: 'completed',
      date: new Date().toISOString(),
      note: `Receipt: ${receipt}`,
    };

    this.transactions.unshift(newTxn);
    return { receipt, newBalance };
  }

  addBeneficiary(phone: string, label?: string): MockBeneficiary {
    const phoneMasked = phone.length > 7
      ? `${phone.slice(0, 4)}****${phone.slice(-3)}`
      : phone;

    const newBen: MockBeneficiary = {
      id: `ben-${Date.now()}`,
      label: label || 'Mobile Number',
      phone_masked: phoneMasked,
      usable: false,
      usable_from: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      raw_phone: phone,
    };
    this.beneficiaries.push(newBen);
    return newBen;
  }

  deleteBeneficiary(id: string): boolean {
    const initialLen = this.beneficiaries.length;
    this.beneficiaries = this.beneficiaries.filter(b => b.id !== id);
    return this.beneficiaries.length < initialLen;
  }
}

export const mockStore = new MockDataStore();
