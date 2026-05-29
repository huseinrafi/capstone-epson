export function triggerHaptic(pattern = 50) {
  const enabled = localStorage.getItem('pref_haptic') !== 'false';
  if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Haptic feedback failed:', e);
    }
  }
}
