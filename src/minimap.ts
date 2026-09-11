import { initialZoom } from './data/constants';
import type { RenderParameters } from './rouletteRenderer';
import type { ColorTheme } from './types/ColorTheme';
import type { MapEntityState } from './types/MapEntity.type';
import type { Rect } from './types/rect.type';
import type { VectorLike } from './types/VectorLike';
import type { UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';

const MINIMAP_SCALE = 2.5;
const MINIMAP_UNITS = 26;
/** 미니맵 좌측 패딩 여백 */
export const MINIMAP_INSET = 10;
/** 미니맵 폭 크기 */
export const MINIMAP_WIDTH = MINIMAP_UNITS * MINIMAP_SCALE;

/**
 * 화면 좌측 맵 전체 상황 축소 미니맵 UI 클래스
 * 구슬 위치, 스테이지 구조물, 현 시점 카메라 영역 표시 및 드래그 탐색 지원
 */
export class Minimap implements UIObject {
  private ctx!: CanvasRenderingContext2D;
  private lastParams: RenderParameters | null = null;

  private _onViewportChangeHandler: ((pos?: VectorLike) => void) | null = null;
  private boundingBox: Rect;
  private mousePosition: { x: number; y: number } | null = null;

  constructor() {
    this.boundingBox = {
      x: MINIMAP_INSET,
      y: MINIMAP_INSET,
      w: MINIMAP_WIDTH,
      h: 0,
    };
  }

  /** 미니맵 사각형 바운딩 박스 반환 */
  getBoundingBox(): Rect | null {
    return this.boundingBox;
  }

  /** 미니맵 마우스 상호작용에 따른 뷰포트 이동 이벤트 콜백 등록 */
  private julesLog(eventName: string, data?: unknown) {
    try {
      console.log(`[Jules Log] [Minimap] [${eventName}]`, JSON.parse(JSON.stringify(data ?? {})));
    } catch {
      console.log(`[Jules Log] [Minimap] [${eventName}]`, data);
    }
  }

  onViewportChange(callback: (pos?: VectorLike) => void) {
    this._onViewportChangeHandler = callback;
    this.julesLog('onViewportChange', { handlerRegistered: true });
  }

  update(): void {
    // 프레임 갱신 연산 없음
  }

  /** 마우스 포인터 이동에 따른 카메라 시점 드래그 이동 처리 */
  @bound
  onMouseMove(e?: { x: number; y: number }) {
    if (!e) {
      this.mousePosition = null;
      this.julesLog('onMouseMove', { mousePosition: null });
      if (this._onViewportChangeHandler) {
        this._onViewportChangeHandler();
      }
      return;
    }
    if (!this.lastParams) return;
    this.mousePosition = {
      x: e.x,
      y: e.y,
    };
    const targetPos = {
      x: this.mousePosition.x / MINIMAP_SCALE,
      y: this.mousePosition.y / MINIMAP_SCALE,
    };
    this.julesLog('onMouseMove', { mousePosition: this.mousePosition, targetViewportPos: targetPos });
    if (this._onViewportChangeHandler) {
      this._onViewportChangeHandler(targetPos);
    }
  }

  /** 미니맵 전체 배경, 장애물, 구슬, 뷰포트 영속 프레임 렌더링 */
  render(ctx: CanvasRenderingContext2D, params: RenderParameters) {
    if (!ctx) return;
    const { stage } = params;
    if (!stage) return;
    this.boundingBox.h = stage.goalY * MINIMAP_SCALE;

    this.lastParams = params;

    this.ctx = ctx;
    ctx.save();
    ctx.fillStyle = params.theme.minimapBackground;
    ctx.translate(MINIMAP_INSET, MINIMAP_INSET);
    ctx.scale(MINIMAP_SCALE, MINIMAP_SCALE);
    ctx.fillRect(0, 0, MINIMAP_UNITS, stage.goalY);

    this.ctx.lineWidth = 3 / (params.camera.zoom + initialZoom);
    this.drawEntities(params.entities, params.theme);
    this.drawMarbles(params);
    this.drawViewport(params);

    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.boundingBox.x, this.boundingBox.y, this.boundingBox.w, this.boundingBox.h);
    ctx.restore();
  }

  /** 미니맵 내 메인 카메라 시야 사각형 영역 렌더링 */
  private drawViewport(params: RenderParameters) {
    this.ctx.save();
    const { camera, size } = params;
    const zoom = camera.zoom * initialZoom;
    const w = size.x / zoom;
    const h = size.y / zoom;
    this.ctx.strokeStyle = params.theme.minimapViewport;
    this.ctx.lineWidth = 1 / zoom;
    this.ctx.strokeRect(camera.x - w / 2, camera.y - h / 2, w, h);
    this.ctx.restore();
  }

  /** 미니맵 내 스테이지 장애물/엔티티 축소 표시 */
  private drawEntities(entities: MapEntityState[], theme: ColorTheme) {
    this.ctx.save();
    entities.forEach((entity) => {
      this.ctx.save();
      this.ctx.fillStyle = entity.shape.color ?? theme.entity[entity.shape.type].fill;
      this.ctx.strokeStyle = entity.shape.color ?? theme.entity[entity.shape.type].outline;
      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);

      this.ctx.save();
      const shape = entity.shape;
      switch (shape.type) {
        case 'box': {
          const w = shape.width * 2;
          const h = shape.height * 2;
          this.ctx.rotate(shape.rotation);
          this.ctx.fillRect(-w / 2, -h / 2, w, h);
          break;
        }
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, shape.radius, 0, Math.PI * 2, false);
          this.ctx.stroke();
          break;
        case 'polyline':
          if (shape.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0][0], shape.points[0][1]);
            for (let i = 1; i < shape.points.length; i++) {
              this.ctx.lineTo(shape.points[i][0], shape.points[i][1]);
            }
            this.ctx.stroke();
          }
          break;
      }
      this.ctx.restore();
      this.ctx.restore();
    });
    this.ctx.restore();
  }

  /** 미니맵 내 점/도트 구슬 위치 렌더링 */
  private drawMarbles(params: RenderParameters) {
    const { marbles } = params;
    const viewPort = {
      x: params.camera.x,
      y: params.camera.y,
      w: params.size.x,
      h: params.size.y,
      zoom: params.camera.zoom * initialZoom,
    };
    marbles.forEach((marble) => {
      marble.render(this.ctx, 1, false, true, undefined, viewPort, params.theme);
    });
  }
}
