import { Particle } from './particle';

/**
 * 파티클 생명주기 및 오브젝트 풀 관리를 담당하는 파티클 매니저.
 */
export class ParticleManager {
  private _activeParticles: Particle[] = [];
  private _particlePool: Particle[] = [];
  private readonly _maxPoolSize = 1000;

  /**
   * 풀에서 파티클 객체를 획득하거나 신규 생성.
   */
  private _acquireParticle(x: number, y: number): Particle {
    let particle = this._particlePool.pop();
    if (!particle) {
      particle = new Particle();
    }
    particle.reset(x, x !== undefined ? y : 0);
    return particle;
  }

  /**
   * 소멸된 파티클을 오브젝트 풀로 반환.
   */
  private _releaseParticle(particle: Particle) {
    if (this._particlePool.length < this._maxPoolSize) {
      this._particlePool.push(particle);
    }
  }

  /**
   * 활성화된 파티클 위치 업데이트 및 수명 만료 객체 풀 반환.
   */
  update(deltaTimeMs: number) {
    for (let i = this._activeParticles.length - 1; i >= 0; i--) {
      const particle = this._activeParticles[i];
      particle.update(deltaTimeMs);

      if (particle.isDestroy) {
        this._releaseParticle(particle);
        this._activeParticles.splice(i, 1);
      }
    }
  }

  /**
   * 활성화된 모든 파티클 렌더링.
   */
  render(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this._activeParticles.length; i++) {
      this._activeParticles[i].render(ctx);
    }
  }

  /**
   * 지정 좌표에서 파티클 폭죽 효과 생성.
   */
  shot(x: number, y: number, count: number = 350) {
    const validCount = Math.max(0, Math.floor(count));
    for (let i = 0; i < validCount; i++) {
      const particle = this._acquireParticle(x, y);
      this._activeParticles.push(particle);
    }
  }

  /**
   * 관리 중인 활성 파티클 개수 반환.
   */
  get activeCount(): number {
    return this._activeParticles.length;
  }
}
