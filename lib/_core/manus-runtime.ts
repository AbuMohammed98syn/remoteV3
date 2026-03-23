/**
 * Manus Runtime – safe area + cookie injection bridge.
 * Stubs for standalone builds outside the Manus container.
 */
import type { Metrics } from 'react-native-safe-area-context';

export function initManusRuntime(): void {
  // No-op outside Manus container
}

export function subscribeSafeAreaInsets(
  _callback: (metrics: Metrics) => void,
): () => void {
  // Returns a no-op unsubscribe
  return () => {};
}
