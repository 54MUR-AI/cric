export function vibrate(pattern: number | number[] = 10) {
  if (navigator.vibrate) navigator.vibrate(pattern)
}
