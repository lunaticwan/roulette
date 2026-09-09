// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { RouletteRenderer } from './rouletteRenderer';

class TestRouletteRenderer extends RouletteRenderer {
  protected override async _load(): Promise<void> {
    return Promise.resolve();
  }
}

describe('RouletteRenderer High-DPI Scaling Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  it('should initialize canvas elements and handle devicePixelRatio scaling', async () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
      writable: true,
    });

    const renderer = new TestRouletteRenderer();
    await renderer.init();

    expect(renderer.dpr).toBe(2);
    expect(renderer.canvas).toBeDefined();

    expect(renderer.canvas.width).toBe(1000 * 2);
    expect(renderer.canvas.height).toBe(600 * 2);
    expect(renderer.width).toBe(1000);
    expect(renderer.height).toBe(600);
  });

  it('should support high devicePixelRatio without artificial capping', async () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 4,
      configurable: true,
      writable: true,
    });

    const renderer = new TestRouletteRenderer();
    await renderer.init();

    expect(renderer.dpr).toBe(4);
    expect(renderer.canvas.width).toBe(1000 * 4);
    expect(renderer.canvas.height).toBe(600 * 4);
  });
});
