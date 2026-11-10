export const INACTIVITY_THROTTLE_MS = 1000;

let lastActivityAt = Date.now();
let lastNotifiedAt = 0;
const listeners = new Set<() => void>();

/** Returns the timestamp (ms) of the most recent recorded user activity. */
export function getLastActivityAt(): number {
  return lastActivityAt;
}

/**
 * Records user interaction and notifies active auto-lock subscribers.
 * Throttled by default so continuous scroll/move gestures do not churn timers.
 */
export function recordUserActivity(force = false): void {
  const now = Date.now();
  lastActivityAt = now;

  if (!force && now - lastNotifiedAt < INACTIVITY_THROTTLE_MS) {
    return;
  }

  lastNotifiedAt = now;
  listeners.forEach(listener => listener());
}

/** Subscribes to throttled activity notifications and returns an unsubscribe callback. */
export function subscribeUserActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Resets tracker state (intended for unit tests). */
export function resetInactivityTrackerForTest(now = Date.now()): void {
  lastActivityAt = now;
  lastNotifiedAt = 0;
}

/**
 * Capture-phase responder props that observe touches/scrolls without claiming
 * the responder, preserving normal Pressable, ScrollView, and TextInput handling.
 */
export const activityCaptureProps = {
  onStartShouldSetResponderCapture: () => {
    recordUserActivity();
    return false;
  },
  onMoveShouldSetResponderCapture: () => {
    recordUserActivity();
    return false;
  },
} as const;
