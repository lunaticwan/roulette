import { describe, expect, it, vi } from 'vitest';
import { Minimap, MINIMAP_WIDTH } from './minimap';

describe('Minimap', () => {
  it('MINIMAP_WIDTH 값이 변경된 스케일(2.5)에 맞춰 65이어야 함', () => {
    expect(MINIMAP_WIDTH).toBe(65);
  });

  it('마우스 이동 시 뷰포트 위치 계산 시 스케일 값으로 정상 변환되어야 함', () => {
    const minimap = new Minimap();
    const handler = vi.fn();
    minimap.onViewportChange(handler);

    // lastParams가 없으면 리턴되므로 임의로 세팅하여 테스트
    Object.defineProperty(minimap, 'lastParams', {
      value: {},
      writable: true,
    });

    minimap.onMouseMove({ x: 25, y: 50 });

    expect(handler).toHaveBeenCalledWith({
      x: 10, // 25 / 2.5
      y: 20, // 50 / 2.5
    });
  });
});
