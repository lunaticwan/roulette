import { Skills, STUCK_DELAY, Themes } from './data/constants';
import type { IPhysics } from './IPhysics';
import options from './options';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';
import { transformGuard } from './utils/transformGuard';
import { rad } from './utils/utils';
import { Vector } from './utils/Vector';

/**
 * 룰렛 게임 내 구슬(Marble) 클래스.
 * 물리 엔진 연동, 3D 가상 그래픽 렌더링, 스킬 생명주기 및 가시 효과 관리를 담당함.
 */
export class Marble {
  type = 'marble' as const;
  name: string = '';
  size: number = 0.5;
  color: string = 'red';
  hue: number = 0;
  impact: number = 0;
  weight: number = 1;
  skill: Skills = Skills.None;
  isActive: boolean = false;

  private _skillRate = 0.0005;
  private _coolTime = 5000;
  private _maxCoolTime = 5000;
  private _stuckTime = 0;
  private lastPosition: VectorLike = { x: 0, y: 0 };
  private theme: ColorTheme = Themes.dark;

  private physics: IPhysics;

  id: number;

  get position() {
    return this.physics.getMarblePosition(this.id) || { x: 0, y: 0, angle: 0 };
  }

  get x() {
    return this.position.x;
  }

  set x(v: number) {
    this.position.x = v;
  }

  get y() {
    return this.position.y;
  }

  set y(v: number) {
    this.position.y = v;
  }

  get angle() {
    return this.position.angle;
  }

  constructor(physics: IPhysics, order: number, max: number, name?: string, weight: number = 1) {
    this.name = name || `M${order}`;
    this.weight = weight;
    this.physics = physics;

    this._maxCoolTime = 1000 + (1 - this.weight) * 4000;
    this._coolTime = this._maxCoolTime * Math.random();
    this._skillRate = 0.2 * this.weight;

    const maxLine = Math.ceil(max / 10);
    const line = Math.floor(order / 10);
    const lineDelta = -Math.max(0, Math.ceil(maxLine - 5));
    this.hue = (360 / max) * order;
    this.color = `hsl(${this.hue} 100% 70%)`;
    this.id = order;

    physics.createMarble(order, 10.25 + (order % 10) * 0.6, maxLine - line + lineDelta);
  }

  /**
   * 구슬 위치, 멈춤(Stuck) 감지 및 스킬 정보 업데이트.
   */
  update(deltaTime: number) {
    if (this.isActive && Vector.lenSq(Vector.sub(this.lastPosition, this.position)) < 0.00001) {
      this._stuckTime += deltaTime;

      if (this._stuckTime > STUCK_DELAY) {
        this.physics.shakeMarble(this.id);
        this._stuckTime = 0;
      }
    } else {
      this._stuckTime = 0;
    }
    this.lastPosition = { x: this.position.x, y: this.position.y };

    this.skill = Skills.None;
    if (this.impact) {
      this.impact = Math.max(0, this.impact - deltaTime);
    }
    if (!this.isActive) return;
    if (options.useSkills) {
      this._updateSkillInformation(deltaTime);
    }
  }

  private _updateSkillInformation(deltaTime: number) {
    if (this._coolTime > 0) {
      this._coolTime -= deltaTime;
    }

    if (this._coolTime <= 0) {
      this.skill = Math.random() < this._skillRate ? Skills.Impact : Skills.None;
      this._coolTime = this._maxCoolTime;
    }
  }

  /**
   * 뷰포트 컬링 및 렌더링 통합 진입점.
   */
  render(
    ctx: CanvasRenderingContext2D,
    zoom: number,
    outline: boolean,
    isMinimap: boolean = false,
    skin: CanvasImageSource | undefined,
    viewPort: { x: number; y: number; w: number; h: number; zoom: number },
    theme: ColorTheme
  ) {
    this.theme = theme;
    const viewPortHw = viewPort.w / viewPort.zoom / 2;
    const viewPortHh = viewPort.h / viewPort.zoom / 2;
    const viewPortLeft = viewPort.x - viewPortHw;
    const viewPortRight = viewPort.x + viewPortHw;
    const viewPortTop = viewPort.y - viewPortHh - this.size / 2;
    const viewPortBottom = viewPort.y + viewPortHh;

    // 컬링: 화면 바깥의 구슬은 렌더링 생략
    if (
      !isMinimap &&
      (this.x < viewPortLeft || this.x > viewPortRight || this.y < viewPortTop || this.y > viewPortBottom)
    ) {
      return;
    }

    const transform = ctx.getTransform();
    if (isMinimap) {
      this._renderMinimap(ctx);
    } else {
      this._renderNormal(ctx, zoom, outline, skin);
    }
    ctx.setTransform(transform);
  }

  private _renderMinimap(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderNormal(ctx: CanvasRenderingContext2D, zoom: number, outline: boolean, skin?: CanvasImageSource) {
    const hs = this.size / 2;

    ctx.save();
    ctx.shadowColor = `hsl(${this.hue} 100% 50%)`;
    ctx.shadowBlur = 8 / zoom;

    if (skin) {
      transformGuard(ctx, () => {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(skin, -hs, -hs, hs * 2, hs * 2);
      });
    } else {
      this._drawMarbleBody(ctx);
    }
    ctx.restore();

    ctx.shadowColor = '';
    ctx.shadowBlur = 0;
    this._drawName(ctx, zoom);

    if (outline) {
      this._drawOutline(ctx, 2 / zoom);
    }

    if (options.useSkills) {
      this._renderCoolTime(ctx, zoom);
    }
  }

  /**
   * 구슬 몸체 렌더링 서브 파이프라인.
   */
  private _drawMarbleBody(ctx: CanvasRenderingContext2D) {
    const radius = this.size / 2;
    const lightness = Math.min(85, this.theme.marbleLightness + 25 * Math.min(1, this.impact / 500));
    const lightX = this.x - radius * 0.35;
    const lightY = this.y - radius * 0.35;

    this._render3DBaseBody(ctx, radius, lightness, lightX, lightY);
    this._renderGlassSwirl(ctx, radius);
    this._renderSpecularHighlight(ctx, radius, lightX, lightY);
    this._renderRimReflection(ctx, radius);
  }

  /**
   * 1. 3D 구체 음영 입체 그라디언트.
   */
  private _render3DBaseBody(
    ctx: CanvasRenderingContext2D,
    radius: number,
    lightness: number,
    lightX: number,
    lightY: number
  ) {
    const baseGrad = ctx.createRadialGradient(lightX, lightY, radius * 0.05, this.x, this.y, radius);
    baseGrad.addColorStop(0, `hsl(${this.hue} 100% ${Math.min(95, lightness + 30)}%)`);
    baseGrad.addColorStop(0.5, `hsl(${this.hue} 100% ${lightness}%)`);
    baseGrad.addColorStop(0.85, `hsl(${this.hue} 95% ${Math.max(15, lightness - 20)}%)`);
    baseGrad.addColorStop(1, `hsl(${this.hue} 90% ${Math.max(5, lightness - 35)}%)`);

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 2. 회전각 연동 유리 질감 패턴.
   */
  private _renderGlassSwirl(ctx: CanvasRenderingContext2D, radius: number) {
    transformGuard(ctx, () => {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.65, 0.2 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = `hsla(${this.hue + 20}, 100%, 85%, 0.45)`;
      ctx.lineWidth = radius * 0.22;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.45, 1.2 * Math.PI, 1.85 * Math.PI);
      ctx.strokeStyle = `hsla(${Math.abs(this.hue - 30)}, 100%, 40%, 0.35)`;
      ctx.lineWidth = radius * 0.18;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(radius * 0.1, -radius * 0.1, radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 100%, 95%, 0.6)`;
      ctx.fill();
    });
  }

  /**
   * 3. 상단 광택 하이라이트.
   */
  private _renderSpecularHighlight(ctx: CanvasRenderingContext2D, radius: number, lightX: number, lightY: number) {
    const highlightGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, radius * 0.55);
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    highlightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)');
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.arc(lightX, lightY, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 4. 하단 외곽 반사광 효과.
   */
  private _renderRimReflection(ctx: CanvasRenderingContext2D, radius: number) {
    const rimGrad = ctx.createRadialGradient(
      this.x + radius * 0.4,
      this.y + radius * 0.4,
      radius * 0.3,
      this.x,
      this.y,
      radius
    );
    rimGrad.addColorStop(0, `hsla(${this.hue}, 100%, 80%, 0.4)`);
    rimGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawName(ctx: CanvasRenderingContext2D, zoom: number) {
    transformGuard(ctx, () => {
      ctx.font = `bold 12pt Pretendard, sans-serif`;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.translate(this.x, this.y + 0.28);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.strokeText(this.name, 0, 0);
      ctx.fillText(this.name, 0, 0);
    });
  }

  private _drawOutline(ctx: CanvasRenderingContext2D, lineWidth: number) {
    ctx.beginPath();
    ctx.strokeStyle = this.theme.marbleWinningBorder;
    ctx.lineWidth = lineWidth;
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  private _renderCoolTime(ctx: CanvasRenderingContext2D, zoom: number) {
    const radius = this.size / 2 + 2.5 / zoom;
    ctx.strokeStyle = this.theme.coolTimeIndicator;
    ctx.lineWidth = 1.5 / zoom;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, rad(270), rad(270 + (360 * this._coolTime) / this._maxCoolTime));
    ctx.stroke();
  }
}
