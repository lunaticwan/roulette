// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { Marble } from './marble';
import type { IPhysics } from './IPhysics';
import { Themes } from './data/constants';

describe('Marble Outline Rendering Tests', () => {
  const mockPhysics: IPhysics = {
    init: vi.fn(),
    start: vi.fn(),
    clear: vi.fn(),
    clearMarbles: vi.fn(),
    createStage: vi.fn(),
    createMarble: vi.fn(),
    getMarblePosition: vi.fn().mockReturnValue({ x: 10, y: 10, angle: 0 }),
    removeMarble: vi.fn(),
    shakeMarble: vi.fn(),
    impact: vi.fn(),
    step: vi.fn(),
    getEntities: vi.fn().mockReturnValue([]),
  };

  it('should set ctx.lineWidth to exact world-space value when outline is enabled', () => {
    const marble = new Marble(mockPhysics, 0, 10, 'TestMarble');

    let capturedLineWidth: number | null = null;
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      getTransform: vi.fn().mockReturnValue({}),
      setTransform: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      clip: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      strokeText: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      set lineWidth(val: number) {
        capturedLineWidth = val;
      },
      get lineWidth() {
        return capturedLineWidth ?? 1;
      },
      strokeStyle: '',
      fillStyle: '',
      shadowBlur: 0,
      shadowColor: '',
      font: '',
    } as unknown as CanvasRenderingContext2D;

    const zoom = 30;
    const viewPort = { x: 10, y: 10, w: 100, h: 100, zoom };

    marble.render(mockCtx, zoom, true, false, undefined, viewPort, Themes.dark);

    expect(capturedLineWidth).toBeCloseTo(2 / 30, 5);
  });
});
