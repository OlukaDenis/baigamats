import { ApiError } from '../client';
import { shouldRetry } from '../queryClient';

describe('shouldRetry', () => {
  it('does not retry client errors or invalid payloads', () => {
    expect(shouldRetry(0, new ApiError('x', 'http', 404))).toBe(false);
    expect(shouldRetry(0, new ApiError('x', 'validation', 200))).toBe(false);
  });

  it('retries server, network and timeout errors up to 3 times', () => {
    for (const error of [
      new ApiError('x', 'http', 503),
      new ApiError('x', 'network'),
      new ApiError('x', 'timeout'),
    ]) {
      expect(shouldRetry(2, error)).toBe(true);
      expect(shouldRetry(3, error)).toBe(false);
    }
  });
});
