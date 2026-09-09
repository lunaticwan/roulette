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
  });

  it('should initialize canvas elements and handle devicePixelRatio scaling', async () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
      writable: true,
    });

    const renderer = new TestRouletteRenderer();
    // Pre-mock element before init creates canvas
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const el = origCreate(tagName, options);
      if (tagName === 'canvas') {
        vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
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
      }
      return el;
    });

    await renderer.init();

    expect(renderer.dpr).toBe(2);
    expect(renderer.canvas).toBeDefined();

    expect(renderer.canvas.width).toBe(1000 * 2);
    expect(renderer.canvas.height).toBe(600 * 2);
    expect(renderer.width).toBe(1000);
    expect(renderer.height).toBe(600);

    vi.restoreAllMocks();
  });

  it('should cap devicePixelRatio at 3 for extreme pixel densities', async () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 4,
      configurable: true,
      writable: true,
    });

    const renderer = new TestRouletteRenderer();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const el = origCreate(tagName, options);
      if (tagName === 'canvas') {
        vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
          width: 800,
          height: 600,
          top: 0,
          left: 0,
          bottom: 600,
          right: 800,
          x: 0,
          y: 0,
          toJSON: () => {},
        });
      }
      return el;
    });

    await renderer.init();

    expect(renderer.dpr).toBe(3);
    expect(renderer.canvas.width).toBe(800 * 3);
    expect(renderer.canvas.height).toBe(600 * 3);

    vi.restoreAllMocks();
  });
});
