// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { Roulette } from './roulette';

vi.mock('./physics-box2d', () => {
  return {
    Box2dPhysics: class {
      async init(): Promise<void> {}
      createStage(): void {}
      createMarble(): void {}
      getEntities(): unknown[] {
        return [];
      }
      step(): void {}
      start(): void {}
      clearMarbles(): void {}
      clear(): void {}
      removeMarble(): void {}
    },
  };
});

vi.mock('./rouletteRenderer', () => {
  return {
    RouletteRenderer: class {
      width = 800;
      height = 600;
      sizeFactor = 1;
      canvas = document.createElement('canvas');
      async init(): Promise<void> {}
      render(): void {}
      closeResultPopup(): void {}
      getResultCloseHitAt(): boolean {
        return false;
      }
    },
  };
});

vi.mock('./utils/videoRecorder', () => {
  return {
    VideoRecorder: class {
      async start(): Promise<void> {}
      stop(): void {}
    },
  };
});

describe('Roulette state and guard logic', () => {
  it('초기 상태에서 isRunning은 false여야 함', async () => {
    const roulette = new Roulette();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(roulette.isRunning).toBe(false);
  });

  it('start() 실행 시 isRunning이 true가 되고, 이미 실행 중이면 추가 처리를 실행하지 않음', async () => {
    const roulette = new Roulette();
    await new Promise((resolve) => setTimeout(resolve, 50));

    roulette.start();
    expect(roulette.isRunning).toBe(true);

    // 연이은 start() 호출 시 무시되어야 함
    expect(() => roulette.start()).not.toThrow();
    expect(roulette.isRunning).toBe(true);
  });

  it('reset() 실행 시 구슬 및 맵 상태가 초기화되어야 함', async () => {
    const roulette = new Roulette();
    await new Promise((resolve) => setTimeout(resolve, 50));

    roulette.setMarbles(['사과', '바나나']);
    expect(roulette.getCount()).toBe(2);

    roulette.reset();
    expect(roulette.getCount()).toBe(0);
  });
});
