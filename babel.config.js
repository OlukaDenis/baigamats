module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }],
    // Also registers react-native-reanimated/plugin (→ react-native-worklets/plugin),
    // so it must not be added again below.
    'nativewind/babel',
  ],
};
