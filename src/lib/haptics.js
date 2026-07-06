export function vibrate(pattern = 10) {
  if (navigator.vibrate) navigator.vibrate(pattern)
}
