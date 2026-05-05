import confetti from 'canvas-confetti';

export function triggerConfetti(intensity = 'medium') {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
  };

  const intensities = {
    light: { particleCount: 25, ...defaults },
    medium: { particleCount: 50, ...defaults },
    heavy: { particleCount: 100, ...defaults, spread: 45, ticks: 100 },
  };

  const config = intensities[intensity] || intensities.medium;

  // Confetti from left
  confetti({
    ...config,
    angle: 45,
    origin: { x: 0, y: 0.5 },
  });

  // Confetti from right
  confetti({
    ...config,
    angle: 135,
    origin: { x: 1, y: 0.5 },
  });
}

export function triggerFireworks() {
  const end = Date.now() + 1000;

  const fireWorksLoop = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(fireWorksLoop);
      return;
    }

    confetti({
      particleCount: 50,
      angle: Math.random() * 360,
      spread: 100,
      gravity: 1,
      decay: 0.95,
      startVelocity: 40,
      origin: { x: Math.random(), y: Math.random() * 0.5 },
    });
  }, 100);
}
