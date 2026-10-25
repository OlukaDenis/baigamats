/**
 * Colours resolve to CSS variables set at runtime by src/theme/ThemeProvider.tsx,
 * which reads the brand palette from src/theme/colors.ts. Do not add raw hex
 * values here.
 *
 * @type {import('tailwindcss').Config}
 */
const token = name => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./index.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: token('primary'),
        secondary: token('secondary'),
        tertiary: token('tertiary'),
        background: token('background'),
        surface: token('surface'),
        'on-primary': token('on-primary'),
        'on-secondary': token('on-secondary'),
        content: token('text'),
      },
    },
  },
  plugins: [],
};
