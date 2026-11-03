import { env } from '@shared/config/env';

/**
 * Global toggle for mock data testing.
 * Driven by the ENABLE_MOCK flag in the environment file (default: true).
 */
export const IS_MOCK_ENABLED = env.ENABLE_MOCK;
