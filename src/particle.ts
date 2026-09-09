import type { VectorLike } from './types/VectorLike';
import { rad } from './utils/utils';

const DEFAULT_LIFETIME_MS = 2500;

/**
 * 폭죽 및 축하 이펙트용 파티클 클래스.
 * 오브젝트 풀링 지원을 통해 재사용 가능한 구조로 설계됨.
 */
export class Particle {
  private _elapsed: number = 0;
  private _lifetime: number = DEFAULT_LIFETIME_MS;

  position: VectorLike = { x: 0, y: 0 };
  velocity: VectorLike = { x: 0, y: 0 };
  color: string = '#ffffff';
  hue: number = 0;
  size: number = 8;
  isDestroy: boolean = false;
  isSpark: boolean = false;

  constructor() {
    this.reset(0, 0);
  }

  /**
   * 파티클 상태 재초기화 (오브젝트 풀에서 재사용 시 호출).
   */
  reset(x: number, y: number) {
    this._elapsed = 0;
    this._lifetime = DEFAULT_LIFETIME_MS + (Math.random() - 0.5) * 800;
    this.isDestroy = false;
    this.position.x = x;
    this.position.y = y;

    this.hue = Math.random() * 360;
    this.color = `hsl(${this.hue}, 90%, 60%)`;
    this.size = 4 + Math.random() * 8;
    this.isSpark = Math.random() < 0.25;

    const speed = 80 + Math.random() * 280;
    const angleRad = rad(Math.random() * 360);
    this.velocity = {
      x: Math.cos(angleRad) * speed,
      y: Math.sin(angleRad) * speed,
    };
  }

  /**
   * 파티클 위치 및 속도 업데이트.
   */
  update(deltaTimeMs: number) {
    if (this.isDestroy) return;

    this._elapsed += deltaTimeMs;
    const dtSec = deltaTimeMs / 1000;

    this.position.x += this.velocity.x * dtSec;
    this.position.y += this.velocity.y * dtSec;

    // 공기 저항 및 중력 적용
    this.velocity.x *= 0.97;
    this.velocity.y *= 0.97;
    this.velocity.y += 180 * dtSec;

    if (this._elapsed >= this._lifetime) {
      this.isDestroy = true;
    }
  }

  /**
   * Canvas 2D 에 파티클 렌더링.
   */
  render(ctx: CanvasRenderingContext2D) {
    if (this.isDestroy) return;

    const progress = Math.min(1, this._elapsed / this._lifetime);
    const alpha = Math.max(0, 1 - progress ** 1.5);
    const currentRadius = Math.max(0.5, this.size * (1 - progress * 0.4));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.isSpark) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, currentRadius * 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
