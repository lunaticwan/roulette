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
        ctx.beginPath();
        ctx.arc(0, 0, hs, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(skin, -hs, -hs, hs * 2, hs * 2);
      });
      this._drawGlassOverlay(ctx);
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

    if (options.useSkills && this.isActive) {
      this._renderCoolTime(ctx, zoom);
    }
  }

  /**
   * 구슬 몸체 렌더링 서브 파이프라인.
   */
  private _drawMarbleBody(ctx: CanvasRenderingContext2D) {
    const radius = this.size / 2;
    const impactFactor = Math.min(1, this.impact / 300);
    const lightness = Math.min(85, this.theme.marbleLightness + 25 * impactFactor);
    const lightAngle = this.x * 0.2 + this.y * 0.2;
    const lightOffsetX = Math.cos(lightAngle) * radius * 0.08;
    const lightOffsetY = Math.sin(lightAngle) * radius * 0.08;
    const lightX = this.x - radius * 0.35 + lightOffsetX;
    const lightY = this.y - radius * 0.35 + lightOffsetY;

    this._render3DBaseBody(ctx, radius, lightness, lightX, lightY);
    this._renderGlassSwirl(ctx, radius);
    this._renderSpecularHighlight(ctx, radius, lightX, lightY, impactFactor);
    this._renderRimReflection(ctx, radius, impactFactor);
  }

  /**
   * 커스텀 스킨 상단 3D 유리 구체 오버레이 렌더링.
   */
  private _drawGlassOverlay(ctx: CanvasRenderingContext2D) {
    const radius = this.size / 2;
    const impactFactor = Math.min(1, this.impact / 300);
    const lightAngle = this.x * 0.2 + this.y * 0.2;
    const lightOffsetX = Math.cos(lightAngle) * radius * 0.08;
    const lightOffsetY = Math.sin(lightAngle) * radius * 0.08;
    const lightX = this.x - radius * 0.35 + lightOffsetX;
    const lightY = this.y - radius * 0.35 + lightOffsetY;

    this._renderSpecularHighlight(ctx, radius, lightX, lightY, impactFactor);
    this._renderRimReflection(ctx, radius, impactFactor);
  }

  /**
   * 1. 3D 구체 음영 입체 그라디언트 및 하부 산란광 렌더링.
   */
  private _render3DBaseBody(
    ctx: CanvasRenderingContext2D,
    radius: number,
    lightness: number,
    lightX: number,
    lightY: number
  ) {
    const baseGrad = ctx.createRadialGradient(lightX, lightY, radius * 0.05, this.x, this.y, radius);
    baseGrad.addColorStop(0, `hsl(${this.hue} 100% ${Math.min(98, lightness + 38)}%)`);
    baseGrad.addColorStop(0.2, `hsl(${this.hue} 100% ${lightness}%)`);
    baseGrad.addColorStop(0.65, `hsl(${this.hue} 95% ${Math.max(18, lightness - 18)}%)`);
    baseGrad.addColorStop(0.88, `hsl(${this.hue} 90% ${Math.max(5, lightness - 35)}%)`);
    baseGrad.addColorStop(1, `hsla(${this.hue}, 100%, ${Math.max(10, lightness - 10)}%, 0.85)`);

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 2. 회전각 연동 다층 유리 소용돌이 및 입체 핵(Nucleus) 패턴.
   */
  private _renderGlassSwirl(ctx: CanvasRenderingContext2D, radius: number) {
    transformGuard(ctx, () => {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // 내부 입체 코어 핵
      ctx.beginPath();
      ctx.arc(radius * 0.05, -radius * 0.05, radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 100%, 95%, 0.65)`;
      ctx.fill();

      // 주 고굴절 소용돌이 띠
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.62, 0.15 * Math.PI, 0.9 * Math.PI);
      ctx.strokeStyle = `hsla(${this.hue + 25}, 100%, 88%, 0.55)`;
      ctx.lineWidth = radius * 0.25;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 보조 대비 음영 띠
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.42, 1.15 * Math.PI, 1.88 * Math.PI);
      ctx.strokeStyle = `hsla(${Math.abs(this.hue - 35)}, 100%, 35%, 0.45)`;
      ctx.lineWidth = radius * 0.18;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 외곽 미세 굴절 반사선
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.75, 1.4 * Math.PI, 1.7 * Math.PI);
      ctx.strokeStyle = `hsla(${this.hue}, 100%, 98%, 0.3)`;
      ctx.lineWidth = radius * 0.12;
      ctx.lineCap = 'round';
      ctx.stroke();
    });
  }

  /**
   * 3. 주 광택 곡면 하이라이트 및 대각선 대향 보조 핀포인트 스페큘러.
   */
  private _renderSpecularHighlight(
    ctx: CanvasRenderingContext2D,
    radius: number,
    lightX: number,
    lightY: number,
    impactFactor: number = 0
  ) {
    const glint = Math.min(1, 0.92 + impactFactor * 0.08);
    const primaryGrad = ctx.createRadialGradient(
      lightX,
      lightY,
      0,
      lightX,
      lightY,
      radius * (0.52 + impactFactor * 0.1)
    );
    primaryGrad.addColorStop(0, `rgba(255, 255, 255, ${glint})`);
    primaryGrad.addColorStop(0.35, `rgba(255, 255, 255, ${0.45 + impactFactor * 0.2})`);
    primaryGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = primaryGrad;
    ctx.beginPath();
    ctx.arc(lightX, lightY, radius * (0.52 + impactFactor * 0.1), 0, Math.PI * 2);
    ctx.fill();

    // 대각선 반대편 보조 핀포인트 반사
    const subX = this.x + radius * 0.32;
    const subY = this.y + radius * 0.32;
    const secondaryGrad = ctx.createRadialGradient(subX, subY, 0, subX, subY, radius * 0.22);
    secondaryGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, 0.65 + impactFactor * 0.25)})`);
    secondaryGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = secondaryGrad;
    ctx.beginPath();
    ctx.arc(subX, subY, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    if (impactFactor > 0.1) {
      transformGuard(ctx, () => {
        ctx.translate(lightX, lightY);
        ctx.fillStyle = `rgba(255, 255, 255, ${impactFactor * 0.8})`;
        ctx.fillRect(-radius * 0.25, -radius * 0.03, radius * 0.5, radius * 0.06);
        ctx.fillRect(-radius * 0.03, -radius * 0.25, radius * 0.06, radius * 0.5);
      });
    }
  }

  /**
   * 4. 프레넬 외곽 반사광(Fresnel Rim Light) 및 하단 반사림 효과.
   */
  private _renderRimReflection(ctx: CanvasRenderingContext2D, radius: number, impactFactor: number = 0) {
    const rimGrad = ctx.createRadialGradient(this.x, this.y, radius * 0.7, this.x, this.y, radius);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rimGrad.addColorStop(0.75, `hsla(${this.hue}, 100%, 85%, ${0.25 + impactFactor * 0.35})`);
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawName(ctx: CanvasRenderingContext2D, zoom: number) {
    transformGuard(ctx, () => {
      ctx.font = `bold 16px Pretendard, sans-serif`;
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

  /** 당첨 구슬 외곽선 렌더링 */
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
