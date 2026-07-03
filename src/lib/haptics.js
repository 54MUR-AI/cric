export function vibrate(pattern = 10) {
  if (navigator.vibrate) navigator.vibrate(pattern)
}

export function useHaptics() {
  return {
    light: () => vibrate(8),
    medium: () => vibrate(15),
    heavy: () => vibrate(30),
    success: () => vibrate([10, 20, 10]),
    error: () => vibrate([30, 15, 30]),
  }
}
