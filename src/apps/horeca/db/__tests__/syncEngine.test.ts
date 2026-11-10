import { horecaApi } from '../../api/horecaApiClient';
import { useHorecaStore } from '../offlineStore';
import { outboxRepository } from '../repositories/outboxRepository';
import { syncEngine } from '../syncEngine';

jest.mock('../DatabaseManager', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn(cb => cb()),
    batch: jest.fn(),
  },
  databaseManager: {
    getCurrentUserId: jest.fn(() => 'staff-01'),
  },
}));

describe('syncEngine.processOutbox', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    useHorecaStore.setState({
      isOnline: true,
      outbox: [],
      orders: {},
      tables: [],
      kitchenTickets: [],
    });
  });

  it('awaits the in-flight outbox run instead of resolving early when called concurrently', async () => {
    jest.spyOn(outboxRepository, 'getNextPendingMutation').mockResolvedValue(null);
    jest.spyOn(outboxRepository, 'enqueueMutation').mockResolvedValue({} as any);
    jest.spyOn(outboxRepository, 'dequeueMutation').mockResolvedValue(undefined);

    let resolveCancel!: (value: { id: string; status: 'cancelled' }) => void;
    const cancelPromise = new Promise<{ id: string; status: 'cancelled' }>(res => {
      resolveCancel = res;
    });
    const cancelSpy = jest.spyOn(horecaApi, 'cancelOrder').mockReturnValue(cancelPromise);

    useHorecaStore.getState().deleteOrderOptimistic('ord-77');

    // First call starts processing
    const firstPass = syncEngine.processOutbox();

    // Wait a microtask so processOutbox is inside await horecaApi.cancelOrder('ord-77')
    await Promise.resolve();
    await Promise.resolve();

    let secondResolved = false;
    const secondPass = syncEngine.processOutbox().then(() => {
      secondResolved = true;
    });

    await Promise.resolve();
    expect(cancelSpy).toHaveBeenCalledWith('ord-77');
    expect(secondResolved).toBe(false);

    resolveCancel({ id: 'ord-77', status: 'cancelled' });
    await Promise.all([firstPass, secondPass]);

    expect(secondResolved).toBe(true);
    expect(useHorecaStore.getState().outbox).toHaveLength(0);
  });
});
