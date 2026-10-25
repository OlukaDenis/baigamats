module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|react-native-heroicons|react-native-svg|react-native-screens|react-native-safe-area-context)/)',
  ],
};
