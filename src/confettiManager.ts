import confetti from 'canvas-confetti';

/**
 * 당첨 및 이벤트 연출용 폭죽 이펙트 매니저 클래스.
 */
export class ConfettiManager {
  /**
   * 단일 burst 효과 (골인 시 축하).
   * @param x 상대적 X 위치 (0 ~ 1)
   * @param y 상대적 Y 위치 (0 ~ 1)
   */
  public triggerGoalBurst(x: number = 0.5, y: number = 0.5): void {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x, y },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      zIndex: 9999,
    });
  }

  /**
   * 당첨자 확정 및 최종 룰렛 종료 시의 화려한 사이드 및 센터 축하 파티클.
   */
  public triggerVictoryShower(): void {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left & Right cannon bursts
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#00c6ff', '#0072ff', '#f093fb', '#f5576c'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ff9a9e', '#fecfef', '#a1c4fd', '#c2e9fb'],
      });
    }, 250);
  }
}

export const confettiManager = new ConfettiManager();
