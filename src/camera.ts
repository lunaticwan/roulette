import { initialZoom, zoomThreshold } from './data/constants';
import type { StageDef } from './data/maps';
import type { Marble } from './marble';
import type { VectorLike } from './types/VectorLike';

/**
 * 게임 시점 및 줌 조작 카메라 클래스
 * 뷰포트 이동 보간, 대상 구슬 추적, 결승선 부근 자동 줌 조작 담당
 */
export class Camera {
  private _position: VectorLike = { x: 0, y: 0 };
  private _targetPosition: VectorLike = { x: 0, y: 0 };
  private _zoom: number = 1;
  private _targetZoom: number = 1;
  private _locked = false;
  private _shouldFollowMarbles = false;

  /** 현재 카메라 줌 배율 */
  get zoom() {
    return this._zoom;
  }

  /** 목표 카메라 줌 배율 설정 */
  set zoom(v: number) {
    this._targetZoom = v;
  }

  /** 현재 X 좌표 */
  get x() {
    return this._position.x;
  }

  /** 목표 X 좌표 설정 */
  set x(v: number) {
    this._targetPosition.x = v;
  }

  /** 현재 Y 좌표 */
  get y() {
    return this._position.y;
  }

  /** 목표 Y 좌표 설정 */
  set y(v: number) {
    this._targetPosition.y = v;
  }

  /** 현재 위치 좌표 반환 */
  get position() {
    return this._position;
  }

  /**
   * 카메라 좌표 설정
   * @param v 설정 좌표
   * @param force true 일 경우 즉시 이동, false 일 경우 보간 이동
   */
  setPosition(v: VectorLike, force: boolean = false) {
    if (force) {
      return (this._position = { x: v.x, y: v.y });
    }
    return (this._targetPosition = { x: v.x, y: v.y });
  }

  /** 미니맵 조작 시 자동 추적 잠금 여부 설정 */
  lock(v: boolean) {
    this._locked = v;
  }

  /** 구슬 추적 모드 활성화 */
  startFollowingMarbles() {
    this._shouldFollowMarbles = true;
  }

  /**
   * 카메라 초기 위치 및 줌 배율 설정
   * @param center 초기 중심 좌표
   * @param zoom 초기 줌 배율
   */
  initializePosition(center?: VectorLike, zoom?: number) {
    const x = center?.x ?? 12.95;
    const y = center?.y ?? 2;
    const z = zoom ?? 1;

    this._position = { x, y };
    this._targetPosition = { x, y };
    this._zoom = z;
    this._targetZoom = z;
    this._shouldFollowMarbles = false;
  }

  /**
   * 프레임별 카메라 목표 위치 업데이트 및 선형 보간 처리
   */
  update({
    marbles,
    stage,
    needToZoom,
    targetIndex,
  }: {
    marbles: Marble[];
    stage: StageDef;
    needToZoom: boolean;
    targetIndex: number;
  }) {
    if (!this._locked) {
      this._calcTargetPositionAndZoom(marbles, stage, needToZoom, targetIndex);
    }

    this._position.x = this._interpolation(this.x, this._targetPosition.x, 60);
    this._position.y = this._interpolation(this.y, this._targetPosition.y, 8);

    this._zoom = this._interpolation(this._zoom, this._targetZoom, 8);
  }

  /** 목표 추적 구슬 좌표 기반 목표 위치 및 줌 비율 계산 */
  private _calcTargetPositionAndZoom(marbles: Marble[], stage: StageDef, needToZoom: boolean, targetIndex: number) {
    if (!this._shouldFollowMarbles) {
      return;
    }

    if (marbles.length > 0) {
      const targetMarble = marbles[targetIndex] ? marbles[targetIndex] : marbles[0];
      this.setPosition(targetMarble.position);
      if (needToZoom) {
        const goalDist = Math.abs(stage.zoomY - this._position.y);
        this.zoom = Math.max(1, (1 - goalDist / zoomThreshold) * 4);
      } else {
        this.zoom = 1;
      }
    } else {
      this.zoom = 1;
    }
  }

  /** 보간 이동 계산 */
  private _interpolation(current: number, target: number, delta: number = 10) {
    const d = target - current;
    if (Math.abs(d) < 1 / initialZoom) {
      return target;
    }

    return current + d / delta;
  }

  /**
   * 캔버스 컨텍스트를 카메라 좌표 및 줌 상태로 행렬 변환하여 바인딩
   * @param ctx 캔버스 2D 컨텍스트
   * @param callback 변환된 좌표계 내에서 수행할 렌더링 콜백 함수
   * @param dpr 디바이스 픽셀 비율
   */
  renderScene(ctx: CanvasRenderingContext2D, callback: (ctx: CanvasRenderingContext2D) => void, dpr: number = 1) {
    const zoomFactor = initialZoom * 2 * this._zoom;
    const width = ctx.canvas.width / dpr;
    const height = ctx.canvas.height / dpr;
    ctx.save();
    ctx.translate(-this.x * this._zoom, -this.y * this._zoom);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(width / zoomFactor, height / zoomFactor);
    callback(ctx);
    ctx.restore();
  }
}
