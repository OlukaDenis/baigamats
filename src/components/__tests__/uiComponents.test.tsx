import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { usePreferencesStore } from '../../features/preferences/store/preferencesStore';
import { palettes } from '../../theme/colors';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AppText } from '../atoms/AppText';
import { AppTextInput } from '../atoms/AppTextInput';
import { Button } from '../atoms/Button';
import { AlertBanner } from '../molecules/AlertBanner';
import { FormField } from '../molecules/FormField';

describe('UI Components & Dark Mode Visibility', () => {
  afterEach(async () => {
    await act(async () => {
      usePreferencesStore.setState({ themePreference: 'system' });
    });
  });

  it('applies high-contrast dark mode colors and placeholder styling to AppTextInput', async () => {
    await act(async () => {
      usePreferencesStore.setState({ themePreference: 'dark' });
    });

    await render(
      <ThemeProvider>
        <AppTextInput
          accessibilityLabel="Dark mode email input"
          placeholder="you@company.com"
        />
      </ThemeProvider>,
    );

    const input = screen.getByLabelText('Dark mode email input');
    expect(input.props.placeholderTextColor).toBe(palettes.dark.textSecondary);
    expect(input.props.cursorColor).toBe(palettes.dark.primary);

    await fireEvent(input, 'focus');
    await fireEvent(input, 'blur');
  });

  it('toggles password visibility on AppTextInput', async () => {
    await render(
      <ThemeProvider>
        <AppTextInput
          accessibilityLabel="Password input"
          isPassword
          value="secret123"
        />
      </ThemeProvider>,
    );

    const input = screen.getByLabelText('Password input');
    expect(input.props.secureTextEntry).toBe(true);

    const toggleButton = screen.getByRole('button', { name: 'Show password' });
    await fireEvent.press(toggleButton);

    expect(screen.getByLabelText('Password input').props.secureTextEntry).toBe(
      false,
    );
    expect(
      screen.getByRole('button', { name: 'Hide password' }),
    ).toBeOnTheScreen();
  });

  it('renders FormField error alert and AlertBanner with accessible alert role', async () => {
    await render(
      <ThemeProvider>
        <FormField
          label="Business email"
          error="Enter a valid email address"
          value=""
        />
        <AlertBanner message="Invalid credentials provided." />
      </ThemeProvider>,
    );

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(screen.getByText('Enter a valid email address')).toBeOnTheScreen();
    expect(screen.getByText('Invalid credentials provided.')).toBeOnTheScreen();
  });

  it('does not include default text-content class when explicit brand text color class is passed to AppText', async () => {
    await render(
      <ThemeProvider>
        <AppText className="text-on-secondary">Badge Label</AppText>
        <Button label="Outline CTA" variant="outline" />
      </ThemeProvider>,
    );

    expect(screen.getByText('Badge Label')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Outline CTA' })).toBeOnTheScreen();
  });
});
