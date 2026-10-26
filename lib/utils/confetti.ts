import confetti from "canvas-confetti";

export function fireConfetti() {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#4C9DB0", "#FFEBAF", "#173842", "#2D6B78", "#F28C38"],
    });
  } catch {
    // fallback if SSR or canvas disabled
  }
}

export function fireDoubleConfetti() {
  try {
    const end = Date.now() + 1000;
    const interval: NodeJS.Timeout = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        colors: ["#4C9DB0", "#E6D090", "#173842", "#3D8798"],
      });
    }, 200);
  } catch {
    // SSR guard
  }
}
