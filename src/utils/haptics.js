// Haptic feedback for iOS/Android (Vibration API)
export function hapticSuccess() {
  if (navigator.vibrate) {
    navigator.vibrate([10, 20, 10]);
  }
}

export function hapticError() {
  if (navigator.vibrate) {
    navigator.vibrate([30, 10, 30]);
  }
}

export function hapticMilestone() {
  if (navigator.vibrate) {
    navigator.vibrate([15, 10, 15, 10, 15]);
  }
}

export function hapticTap() {
  if (navigator.vibrate) {
    navigator.vibrate(5);
  }
}
