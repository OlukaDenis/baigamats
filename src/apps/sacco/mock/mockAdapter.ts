import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios, { AxiosHeaders } from 'axios';

import { IS_MOCK_ENABLED } from './mockConfig';
import { mockStore } from './mockDataStore';

// In-memory tracker for mock deposit and transfer polling status
const pendingDeposits = new Map<string, { attempts: number; amount: number; phone: string }>();
const pendingTransfers = new Map<string, { attempts: number; amount: number }>();

function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

function createMockResponse(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 || status === 201 ? 'OK' : 'Error',
    headers: new AxiosHeaders({ 'content-type': 'application/json' }),
    config,
  };
}

export const mockAxiosAdapter: AxiosAdapter = async config => {
  const url = config.url || '';
  const method = (config.method || 'get').toUpperCase();

  // If mock mode is disabled or URL is not a member API route, fall back to default network adapter
  if (!IS_MOCK_ENABLED || (!url.includes('/member/') && !url.endsWith('/member'))) {
    const defaultAdapter = axios.defaults.adapter;
    if (typeof defaultAdapter === 'function') {
      return defaultAdapter(config);
    }
    throw new Error('Default network adapter is not available.');
  }

  // Simulate realistic network latency (300ms)
  await sleep(300);

  // Parse body if stringified
  let body: any = {};
  if (typeof config.data === 'string') {
    try {
      body = JSON.parse(config.data);
    } catch {
      body = {};
    }
  } else if (config.data) {
    body = config.data;
  }

  // 1. Member Login: POST /member/auth/login
  if (method === 'POST' && url.includes('/member/auth/login')) {
    return createMockResponse(config, {
      session: {
        access_token: `bmm_mock_${Date.now()}_accesstoken`,
        refresh_token: `bmm_mock_${Date.now()}_refreshtoken`,
        expires_in: 3600,
      },
      member: mockStore.member,
      organization: mockStore.organization,
      mustChangePassword: false,
    });
  }

  // 2. Member Refresh: POST /member/auth/refresh
  if (method === 'POST' && url.includes('/member/auth/refresh')) {
    return createMockResponse(config, {
      session: {
        access_token: `bmm_mock_refreshed_${Date.now()}`,
        refresh_token: body.refresh_token || `bmm_mock_refresh_${Date.now()}`,
        expires_in: 3600,
      },
    });
  }

  // 3. Member Change PIN: POST /member/auth/change-password
  if (method === 'POST' && url.includes('/member/auth/change-password')) {
    return createMockResponse(config, {
      message: 'PIN updated successfully',
    });
  }

  // 4. Member Logout: POST /member/auth/logout
  if (method === 'POST' && url.includes('/member/auth/logout')) {
    return createMockResponse(config, {
      message: 'Logged out successfully',
    });
  }

  // 5. Member Me (Balances & Profile): GET /member/me
  if (method === 'GET' && url.includes('/member/me')) {
    return createMockResponse(config, {
      member: mockStore.member,
      balances: mockStore.balances,
    });
  }

  // 6. Member Transactions: GET /member/transactions
  if (method === 'GET' && url.includes('/member/transactions')) {
    let filtered = [...mockStore.transactions];
    const from = config.params?.from;
    const to = config.params?.to;

    if (from) {
      filtered = filtered.filter(t => t.date >= from);
    }
    if (to) {
      filtered = filtered.filter(t => t.date <= to);
    }

    return createMockResponse(config, {
      data: filtered,
      cursor: null,
      has_more: false,
    });
  }

  // 7. Deposit Quote: GET /member/deposits/quote
  if (method === 'GET' && url.includes('/member/deposits/quote')) {
    const amount = Number(config.params?.amount || 10_000);
    const fee = Math.max(500, Math.round(amount * 0.01));
    return createMockResponse(config, {
      amount,
      fee,
      total_to_pay: amount + fee,
      min_deposit: 1_000,
      max_deposit: 5_000_000,
    });
  }

  // 8. Deposit Initiation: POST /member/deposits
  if (method === 'POST' && url.endsWith('/member/deposits')) {
    const depositId = `dep-${Date.now()}`;
    const amount = Number(body.amount || 50_000);
    const phone = String(body.phone || '256772123456');

    pendingDeposits.set(depositId, { attempts: 0, amount, phone });

    return createMockResponse(config, {
      id: depositId,
      status: 'pending',
      message: 'USSD prompt dispatched to phone.',
    });
  }

  // 9. Deposit Polling Status: GET /member/deposits/:id
  if (method === 'GET' && url.includes('/member/deposits/')) {
    const parts = url.split('/');
    const depositId = parts[parts.length - 1];

    const pending = pendingDeposits.get(depositId || '');
    if (pending) {
      pending.attempts += 1;
      // On 2nd poll attempt, resolve to success and update savings!
      if (pending.attempts >= 2) {
        mockStore.applyDeposit(pending.amount, pending.phone);
        pendingDeposits.delete(depositId || '');
        return createMockResponse(config, {
          id: depositId,
          status: 'success',
          message: 'Deposit confirmed and credited to savings.',
          amount: pending.amount,
        });
      }
    }

    return createMockResponse(config, {
      id: depositId,
      status: 'pending',
      message: 'Waiting for network provider confirmation...',
      amount: pending?.amount || 50_000,
    });
  }

  // 10. Beneficiaries List: GET /member/beneficiaries
  if (method === 'GET' && url.endsWith('/member/beneficiaries')) {
    const responseList = mockStore.beneficiaries.map(b => ({
      id: b.id,
      label: b.label || null,
      phone_masked: b.phone_masked,
      usable: b.usable,
      usable_from: b.usable_from,
    }));
    return createMockResponse(config, responseList);
  }

  // 11. Send Beneficiary OTP: POST /member/beneficiaries/code
  if (method === 'POST' && url.includes('/member/beneficiaries/code')) {
    return createMockResponse(config, { ok: true });
  }

  // 12. Add Beneficiary: POST /member/beneficiaries
  if (method === 'POST' && url.endsWith('/member/beneficiaries')) {
    const newBen = mockStore.addBeneficiary(
      body.phone || '+256770000000',
      body.label || 'Saved Number',
    );
    return createMockResponse(
      config,
      {
        id: newBen.id,
        label: newBen.label,
        phone_masked: newBen.phone_masked,
        usable: newBen.usable,
        usable_from: newBen.usable_from,
      },
      201,
    );
  }

  // 13. Delete Beneficiary: DELETE /member/beneficiaries/:id
  if (method === 'DELETE' && url.includes('/member/beneficiaries/')) {
    const parts = url.split('/');
    const id = parts[parts.length - 1];
    mockStore.deleteBeneficiary(id || '');
    return createMockResponse(config, { ok: true });
  }

  // 14. Requests Quote: GET /member/requests/quote
  if (method === 'GET' && url.includes('/member/requests/quote')) {
    const amount = Number(config.params?.amount || 10_000);
    const kind = String(config.params?.kind || 'withdraw');
    const fee = kind === 'to_shares' ? 500 : Math.max(1_000, Math.round(amount * 0.015));

    return createMockResponse(config, {
      amount,
      fee,
      total_taken_from_savings: amount + fee,
      sms_code_needed: amount >= 500_000, // Large transfers trigger SMS OTP
    });
  }

  // 15. Send Request OTP: POST /member/requests/code
  if (method === 'POST' && url.includes('/member/requests/code')) {
    return createMockResponse(config, { ok: true });
  }

  // 16. Transfer Submit: POST /member/requests
  if (method === 'POST' && url.endsWith('/member/requests')) {
    const transferId = `req-${Date.now()}`;
    const kind = body.kind || 'withdraw';
    const amount = Number(body.amount || 20_000);
    const fee = 1_000;

    // Apply mutation based on kind
    if (kind === 'withdraw') {
      const ben = mockStore.beneficiaries.find(b => b.id === body.beneficiary_id);
      mockStore.applyWithdrawal(amount, fee, ben?.phone_masked || '077****456');
    } else if (kind === 'to_member') {
      mockStore.applyTransferToMember(amount, fee, body.member_no || 'M-2018');
    } else if (kind === 'to_shares') {
      mockStore.applySharesPurchase(amount, fee);
    } else if (kind === 'to_welfare') {
      mockStore.applyWelfareContribution(amount, fee);
    }

    pendingTransfers.set(transferId, { attempts: 0, amount });

    return createMockResponse(config, {
      id: transferId,
      status: 'approved',
      message: 'Transfer processed and approved instantly.',
    });
  }

  // 17. Transfer Polling Status: GET /member/requests/:id
  if (method === 'GET' && url.includes('/member/requests/')) {
    const parts = url.split('/');
    const requestId = parts[parts.length - 1];
    const pending = pendingTransfers.get(requestId || '');

    return createMockResponse(config, {
      id: requestId,
      status: 'completed',
      amount: pending?.amount || 20_000,
      fee: 1_000,
      date: new Date().toISOString(),
      message: 'Request completed.',
    });
  }

  // 18. Loans List: GET /member/loans
  if (method === 'GET' && url.endsWith('/member/loans')) {
    return createMockResponse(config, mockStore.loans);
  }

  // 19. Loan Detail: GET /member/loans/:id
  if (method === 'GET' && url.includes('/member/loans/') && !url.includes('/repay')) {
    const parts = url.split('/');
    const loanId = parts[parts.length - 1];
    const detail = mockStore.loanDetails[loanId || ''] || mockStore.loanDetails['loan-bdev-001'];
    return createMockResponse(config, detail);
  }

  // 20. Loan Repay: POST /member/loans/:id/repay
  if (method === 'POST' && url.includes('/member/loans/') && url.endsWith('/repay')) {
    const parts = url.split('/');
    const repayIndex = parts.indexOf('repay');
    const loanId = repayIndex > 0 ? parts[repayIndex - 1] : 'loan-bdev-001';
    const amount = Number(body.amount || 50_000);

    const { receipt, newBalance } = mockStore.applyLoanRepayment(loanId || '', amount);

    return createMockResponse(config, {
      id: `rpy-${Date.now()}`,
      loan_id: loanId,
      amount_paid: amount,
      new_balance_due: newBalance,
      status: 'completed',
      receipt,
    });
  }

  // Fallback
  return createMockResponse(config, { success: true });
};
