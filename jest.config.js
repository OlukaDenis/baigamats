module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@sacco/(.*)$': '<rootDir>/src/apps/sacco/$1',
    '^@horeca/(.*)$': '<rootDir>/src/apps/horeca/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|react-native-heroicons|react-native-svg|react-native-screens|react-native-safe-area-context|react-native-keychain)/)',
  ],
};
