import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HorecaThemeProvider } from '../../../theme/colors';
import { AppTextInput } from '../../../components/atoms/AppTextInput';
import {
  activityCaptureProps,
  getLastActivityAt,
  INACTIVITY_THROTTLE_MS,
  recordUserActivity,
  resetInactivityTrackerForTest,
  subscribeUserActivity,
} from '../utils/inactivityTracker';

describe('inactivityTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-11T00:00:00Z'));
    resetInactivityTrackerForTest(Date.now());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('records activity via capture responder props without claiming the responder', () => {
    const startTime = Date.now();
    jest.advanceTimersByTime(5000);

    expect(activityCaptureProps.onStartShouldSetResponderCapture()).toBe(false);
    expect(getLastActivityAt()).toBe(startTime + 5000);

    jest.advanceTimersByTime(2000);
    expect(activityCaptureProps.onMoveShouldSetResponderCapture()).toBe(false);
    expect(getLastActivityAt()).toBe(startTime + 7000);
  });

  it('throttles listener notifications within INACTIVITY_THROTTLE_MS unless forced', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeUserActivity(listener);

    recordUserActivity(true);
    expect(listener).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(INACTIVITY_THROTTLE_MS - 200);
    recordUserActivity();
    expect(listener).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(300);
    recordUserActivity();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('keeps an active session unlocked past 6 minutes when activity continues and locks after 6 minutes of idle', () => {
    const timeoutMs = 360 * 1000;
    const lockTerminal = jest.fn();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleLockTimer = () => {
      if (timer) clearTimeout(timer);
      const remaining = timeoutMs - (Date.now() - getLastActivityAt());
      if (remaining <= 0) {
        lockTerminal();
        return;
      }
      timer = setTimeout(() => {
        if (Date.now() - getLastActivityAt() >= timeoutMs) {
          lockTerminal();
        } else {
          scheduleLockTimer();
        }
      }, remaining);
    };

    recordUserActivity(true);
    scheduleLockTimer();
    const unsubscribe = subscribeUserActivity(scheduleLockTimer);

    // 5 minutes pass, then user interacts
    jest.advanceTimersByTime(300 * 1000);
    expect(lockTerminal).not.toHaveBeenCalled();
    recordUserActivity();

    // Another 5 minutes pass (total 10 minutes since login, 5 since last interaction)
    jest.advanceTimersByTime(300 * 1000);
    expect(lockTerminal).not.toHaveBeenCalled();

    // Remaining 1 minute passes with zero activity -> locks
    jest.advanceTimersByTime(60 * 1000);
    expect(lockTerminal).toHaveBeenCalledTimes(1);

    if (timer) clearTimeout(timer);
    unsubscribe();
  });

  it('records activity when focusing or typing into AppTextInput', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeUserActivity(listener);

    await render(
      <HorecaThemeProvider>
        <AppTextInput accessibilityLabel="Notes input" value="" onChangeText={() => {}} />
      </HorecaThemeProvider>,
    );

    const input = screen.getByLabelText('Notes input');
    jest.advanceTimersByTime(INACTIVITY_THROTTLE_MS + 100);
    await fireEvent(input, 'focus');
    expect(listener).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(INACTIVITY_THROTTLE_MS + 100);
    await fireEvent.changeText(input, 'extra spicy');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
