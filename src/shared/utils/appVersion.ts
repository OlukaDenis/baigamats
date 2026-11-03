import { Platform } from 'react-native';

export const APP_VERSION = '1.0.0';

/**
 * Returns the X-App-Version header value as required by Baigamats API v1.
 * Format: `<platform>/<version>`, e.g., `android/1.0.0` or `ios/1.0.0`.
 */
export function getAppVersionHeader(): string {
  const os = Platform.OS === 'ios' ? 'ios' : 'android';
  return `${os}/${APP_VERSION}`;
}

