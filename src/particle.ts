import type { VectorLike } from './types/VectorLike';
import { rad } from './utils/utils';
import { Vector } from './utils/Vector';

const lifetime = 3000;

export class Particle {
  private _elapsed: number = 0;
  position: VectorLike = { x: 0, y: 0 };
  force: VectorLike = { x: 0, y: 0 };
  color: string = '';
  isDestroy: boolean = false;

  constructor(x: number, y: number) {
    this.position.x = x;
    this.position.y = y;

    const force = Math.random() * 250;
    const ang = rad(90 * Math.random() - 180);
    const fx = Math.cos(ang) * force;
    const fy = Math.sin(ang) * force;
    this.color = `hsl(${Math.random() * 360} 50% 50%)`;
    this.force = { x: fx, y: fy };
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    const delta = Vector.mul(this.force, deltaTime / 100);
    this.position = Vector.add(this.position, delta);
    this.force.y += (10 * deltaTime) / 100;
    if (this._elapsed > lifetime) {
      this.isDestroy = true;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const alpha = Math.max(0, 1 - (this._elapsed / lifetime) ** 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
