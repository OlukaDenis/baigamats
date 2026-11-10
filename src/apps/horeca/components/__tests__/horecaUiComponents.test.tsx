import React from 'react';
import { Appearance, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { usePreferencesStore } from '@shared/preferences/preferencesStore';
import { ThemeProvider } from '@sacco/theme/ThemeProvider';
import { useTheme } from '@sacco/theme/ThemeProvider';
import {
  HorecaThemeProvider,
  horecaDarkColors,
  horecaLightColors,
  toHorecaCssVariables,
  toRgbChannels,
  useHorecaColors,
  useHorecaTheme,
} from '../../theme/colors';
import { AppTextInput } from '../atoms/AppTextInput';
import { Button } from '../atoms/Button';
import { SearchBar } from '../molecules/SearchBar';
import { Select } from '../molecules/Select';
import { TABLE_STATUS_TONES, TableCard } from '../organisms/TableCard';

function HorecaThemeProbe() {
  const { scheme, isDark, colors, toggleTheme } = useHorecaTheme();
  return (
    <>
      <Text testID="horeca-scheme">{scheme}</Text>
      <Text testID="horeca-dark">{String(isDark)}</Text>
      <Text testID="horeca-bg">{colors.background}</Text>
      <Button label="Toggle Horeca Theme" onPress={toggleTheme} />
    </>
  );
}

function SaccoThemeProbe() {
  const { scheme } = useTheme();
  return <Text testID="sacco-scheme">{scheme}</Text>;
}

function HorecaFallbackProbe() {
  const colors = useHorecaColors();
  return <Text testID="horeca-fallback-bg">{colors.background}</Text>;
}

describe('HORECA UI Components & Default Light Theme', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await act(async () => {
      usePreferencesStore.setState({ themePreference: 'light' });
    });
  });

  it('defaults both horeca and sacco to light mode even when system color scheme is dark', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

    expect(usePreferencesStore.getState().themePreference).toBe('light');

    await render(
      <>
        <HorecaThemeProvider>
          <HorecaThemeProbe />
        </HorecaThemeProvider>
        <ThemeProvider>
          <SaccoThemeProbe />
        </ThemeProvider>
        <HorecaFallbackProbe />
      </>,
    );

    expect(screen.getByTestId('horeca-scheme').props.children).toBe('light');
    expect(screen.getByTestId('horeca-dark').props.children).toBe('false');
    expect(screen.getByTestId('horeca-bg').props.children).toBe(
      horecaLightColors.background,
    );
    expect(screen.getByTestId('sacco-scheme').props.children).toBe('light');
    expect(screen.getByTestId('horeca-fallback-bg').props.children).toBe(
      horecaLightColors.background,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Toggle Horeca Theme' }),
    );

    expect(screen.getByTestId('horeca-scheme').props.children).toBe('dark');
    expect(screen.getByTestId('horeca-bg').props.children).toBe(
      horecaDarkColors.background,
    );
  });

  it('applies 5px default radius and 58px default height to Button with className and prop precedence', async () => {
    await render(
      <HorecaThemeProvider>
        <Button label="Default CTA" />
        <Button
          label="Class Override CTA"
          className="rounded-2xl min-h-14"
        />
        <Button
          label="Prop Override CTA"
          className="rounded-2xl min-h-14"
          borderRadius={12}
          height={64}
        />
      </HorecaThemeProvider>,
    );

    const defaultBtn = screen.getByRole('button', { name: 'Default CTA' });
    expect(defaultBtn.props.className).toContain('rounded-horeca');
    expect(defaultBtn.props.className).toContain('min-h-[58px]');

    const classBtn = screen.getByRole('button', { name: 'Class Override CTA' });
    expect(classBtn.props.className).toContain('rounded-2xl');
    expect(classBtn.props.className).toContain('min-h-14');

    const propBtn = screen.getByRole('button', { name: 'Prop Override CTA' });
    const propStyle = StyleSheet.flatten(propBtn.props.style);
    expect(propStyle.borderRadius).toBe(12);
    expect(propStyle.minHeight).toBe(64);
    expect(propStyle.height).toBe(64);
  });

  it('applies 5px default radius and 58px default height to AppTextInput with prop precedence', async () => {
    await render(
      <HorecaThemeProvider>
        <AppTextInput accessibilityLabel="Default input" />
        <AppTextInput
          accessibilityLabel="Class override input"
          className="rounded-2xl min-h-12"
        />
        <AppTextInput
          accessibilityLabel="Prop override input"
          className="rounded-2xl min-h-12"
          borderRadius={14}
          height={70}
        />
      </HorecaThemeProvider>,
    );

    const defaultInput = screen.getByLabelText('Default input');
    expect(defaultInput.props.className).toContain('min-h-[58px]');
    const defaultWrapper = defaultInput.parent;
    expect(defaultWrapper?.props.className).toContain('rounded-horeca');
    expect(defaultWrapper?.props.className).toContain('min-h-[58px]');
    expect(defaultWrapper?.props.className).toContain('bg-input');

    const classInput = screen.getByLabelText('Class override input');
    const classWrapper = classInput.parent;
    expect(classWrapper?.props.className).toContain('rounded-2xl');
    expect(classWrapper?.props.className).toContain('min-h-12');

    const propInput = screen.getByLabelText('Prop override input');
    expect(StyleSheet.flatten(propInput.props.style).minHeight).toBe(70);
    const propWrapper = propInput.parent;
    expect(StyleSheet.flatten(propWrapper?.props.style).borderRadius).toBe(14);
    expect(StyleSheet.flatten(propWrapper?.props.style).height).toBe(70);
    expect(StyleSheet.flatten(propWrapper?.props.style).minHeight).toBe(70);
  });

  it('applies 5px default radius and 58px default height to Select with className and prop precedence', async () => {
    const options = [
      { label: 'Main Dining', value: 'main' },
      { label: 'Patio', value: 'patio' },
    ];

    await render(
      <HorecaThemeProvider>
        <Select
          label="Section"
          options={options}
          value="main"
          onChange={() => {}}
        />
        <Select
          label="Custom Section"
          options={options}
          value="patio"
          onChange={() => {}}
          triggerClassName="rounded-xl min-h-12"
          borderRadius={10}
          height={62}
        />
      </HorecaThemeProvider>,
    );

    const defaultTrigger = screen.getByRole('button', {
      name: 'Section: Main Dining',
    });
    expect(defaultTrigger.props.className).toContain('rounded-horeca');
    expect(defaultTrigger.props.className).toContain('min-h-[58px]');
    expect(defaultTrigger.props.className).toContain('bg-input');

    const customTrigger = screen.getByRole('button', {
      name: 'Custom Section: Patio',
    });
    expect(customTrigger.props.className).toContain('rounded-xl');
    const customStyle = StyleSheet.flatten(customTrigger.props.style);
    expect(customStyle.borderRadius).toBe(10);
    expect(customStyle.minHeight).toBe(62);
    expect(customStyle.height).toBe(62);
  });

  it('uses lighter grey input background tokens in both light and dark themes', async () => {
    expect(horecaLightColors.inputBackground).toBe('#f3f4f6');
    expect(horecaDarkColors.inputBackground).toBe('#222b3a');
    expect(toHorecaCssVariables(horecaLightColors)['--color-input']).toBe(
      toRgbChannels(horecaLightColors.inputBackground),
    );
    expect(toHorecaCssVariables(horecaDarkColors)['--color-input']).toBe(
      toRgbChannels(horecaDarkColors.inputBackground),
    );

    await render(
      <HorecaThemeProvider>
        <SearchBar value="" onChangeText={() => {}} placeholder="Search menu" />
      </HorecaThemeProvider>,
    );

    const searchInput = screen.getByLabelText('Search menu');
    expect(searchInput.parent?.props.className).toContain('bg-input');
  });

  it('uses darker green for available tables and maroon for occupied tables', async () => {
    await render(
      <HorecaThemeProvider>
        <TableCard
          table={{
            id: 't1',
            table_number: 'T1',
            capacity: 4,
            section: 'Main',
            status: 'available',
          }}
          onPress={() => {}}
        />
        <TableCard
          table={{
            id: 't2',
            table_number: 'T2',
            capacity: 4,
            section: 'Patio',
            status: 'occupied',
          }}
          onPress={() => {}}
        />
      </HorecaThemeProvider>,
    );

    const availableCard = screen.getByRole('button', {
      name: 'Table T1, available',
    });
    expect(StyleSheet.flatten(availableCard.props.style).backgroundColor).toBe(
      TABLE_STATUS_TONES.available.background,
    );
    expect(TABLE_STATUS_TONES.available.background).toBe('#166534');

    const occupiedCard = screen.getByRole('button', {
      name: 'Table T2, occupied',
    });
    expect(StyleSheet.flatten(occupiedCard.props.style).backgroundColor).toBe(
      TABLE_STATUS_TONES.occupied.background,
    );
    expect(TABLE_STATUS_TONES.occupied.background).toBe('#7F1D1D');
  });
});
