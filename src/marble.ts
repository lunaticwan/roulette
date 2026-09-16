import { Skills, STUCK_DELAY, Themes } from './data/constants';
import type { IPhysics } from './IPhysics';
import { MarbleRenderer, type MarbleStyle } from './marbleRenderer';
import options from './options';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';
import { rad } from './utils/utils';
import { Vector } from './utils/Vector';

/**
 * 룰렛 게임 내 구슬(Marble) 클래스.
 * 물리 엔진 연동, 상태 관리, 스킬 생명주기 및 가시 효과 관리를 담당함.
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
    skin?: CanvasImageSource,
    viewPort?: { x: number; y: number; w: number; h: number; zoom: number },
    theme: ColorTheme = Themes.dark,
    style: MarbleStyle = options.marbleStyle
  ) {
    this.theme = theme;
    MarbleRenderer.getInstance().render(ctx, this, zoom, outline, isMinimap, skin, viewPort, theme, style);
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
