// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { MarbleRenderer } from './marbleRenderer';
import { Marble } from './marble';
import type { IPhysics } from './IPhysics';
import { Themes } from './data/constants';

describe('MarbleRenderer Unit Tests', () => {
  const mockPhysics: IPhysics = {
    init: vi.fn(),
    start: vi.fn(),
    clear: vi.fn(),
    clearMarbles: vi.fn(),
    createStage: vi.fn(),
    createMarble: vi.fn(),
    getMarblePosition: vi.fn().mockReturnValue({ x: 10, y: 10, angle: 0.5 }),
    removeMarble: vi.fn(),
    shakeMarble: vi.fn(),
    impact: vi.fn(),
    step: vi.fn(),
    getEntities: vi.fn().mockReturnValue([]),
  };

  const createMockCtx = () => {
    return {
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
      fillRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      setLineDash: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      shadowBlur: 0,
      shadowColor: '',
      font: '',
    } as unknown as CanvasRenderingContext2D;
  };

  it('MarbleRenderer 싱글톤 인스턴스를 정상적으로 반환해야 함', () => {
    const instance1 = MarbleRenderer.getInstance();
    const instance2 = MarbleRenderer.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('다양한 MarbleStyle(glass, neon, metallic) 프리셋으로 렌더링이 에러 없이 실행되어야 함', () => {
    const renderer = MarbleRenderer.getInstance();
    const marble = new Marble(mockPhysics, 0, 10, 'TestMarble');
    const zoom = 30;
    const viewPort = { x: 10, y: 10, w: 100, h: 100, zoom };

    const styles: Array<'glass' | 'neon' | 'metallic'> = ['glass', 'neon', 'metallic'];

    styles.forEach((style) => {
      const mockCtx = createMockCtx();
      expect(() => {
        renderer.render(mockCtx, marble, zoom, false, false, undefined, viewPort, Themes.dark, style);
      }).not.toThrow();
    });
  });

  it('화면 바깥에 위치한 구슬은 뷰포트 컬링되어 렌더링 메서드가 호출되지 않아야 함', () => {
    const renderer = MarbleRenderer.getInstance();
    const marble = new Marble(mockPhysics, 0, 10, 'TestMarble');
    marble.x = 500;
    marble.y = 500;

    const mockCtx = createMockCtx();
    const viewPort = { x: 10, y: 10, w: 100, h: 100, zoom: 30 };

    renderer.render(mockCtx, marble, 30, false, false, undefined, viewPort, Themes.dark, 'glass');

    expect(mockCtx.save).not.toHaveBeenCalled();
  });
});
