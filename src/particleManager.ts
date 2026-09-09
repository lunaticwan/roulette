import { Particle } from './particle';

export class ParticleManager {
  private _particles: Particle[] = [];

  update(deltaTime: number) {
    this._particles.forEach((particle) => {
      particle.update(deltaTime);
    });
    this._particles = this._particles.filter((particle) => !particle.isDestroy);
  }

  render(ctx: CanvasRenderingContext2D) {
    this._particles.forEach((particle) => particle.render(ctx));
  }

  shot(x: number, y: number) {
    // 고성능 환경 대응: 풍부한 폭죽 이펙트를 위해 파티클 생성량 증가 (500개)
    for (let i = 0; i < 500; i++) {
      this._particles.push(new Particle(x, y));
    }
  }
}
