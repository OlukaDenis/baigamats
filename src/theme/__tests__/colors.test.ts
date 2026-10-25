import { hexToRgbChannels, palettes, toCssVariables, type ThemeColors } from '../colors';

/** WCAG relative luminance / contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgbChannels(hex)
    .split(' ')
    .map(Number)
    .map(channel => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('hexToRgbChannels', () => {
  it('converts #RRGGBB to space-separated channels', () => {
    expect(hexToRgbChannels('#3A104D')).toBe('58 16 77');
    expect(hexToRgbChannels('#ffffff')).toBe('255 255 255');
  });

  it.each(['#FFF', '3A104D', '#GGGGGG', ''])('rejects invalid input %p', value => {
    expect(() => hexToRgbChannels(value)).toThrow('Invalid hex colour');
  });
});

describe('toCssVariables', () => {
  it('maps every token to a CSS variable', () => {
    const variables = toCssVariables(palettes.light);
    expect(variables['--color-primary']).toBe('58 16 77');
    expect(variables['--color-on-secondary']).toBe('58 16 77');
    expect(Object.keys(variables)).toHaveLength(Object.keys(palettes.light).length);
  });
});

describe('brand palette accessibility', () => {
  const pairs: [keyof ThemeColors, keyof ThemeColors][] = [
    ['text', 'background'],
    ['text', 'surface'],
    ['text', 'tertiary'],
    ['onPrimary', 'primary'],
    ['onSecondary', 'secondary'],
  ];

  describe.each(['light', 'dark'] as const)('%s mode', scheme => {
    it.each(pairs)('%s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
      const colors = palettes[scheme];
      expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
    });
  });
});
