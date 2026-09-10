import { Howler } from 'howler';
import options from './options';

/**
 * 효과음 재생 및 오디오 관리를 담당하는 매니저 클래스.
 * 외부 음원 파일 의존성 없이 오프라인 환경에서 Web Audio API 합성 오디오를 활용함.
 */
export class SoundManager {
  private enabled: boolean = true;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.enabled = options.soundEnabled;
  }

  /**
   * 사운드 활성화 여부 설정.
   * @param enabled 활성화 여부
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Howler.mute(!enabled);
  }

  /**
   * 현재 사운드 활성화 여부 반환.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Web Audio Context 초기화 및 구동 확인.
   */
  private getAudioContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const ctxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (ctxClass) {
        this.audioCtx = Howler.ctx || new ctxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * 구슬 충돌 효과음 재생.
   * @param intensity 충돌 강도 (0~1)
   */
  public playBounce(intensity: number = 0.5): void {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const clampedIntensity = Math.min(Math.max(intensity, 0.1), 1.0);
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300 + clampedIntensity * 500, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      gain.gain.setValueAtTime(clampedIntensity * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // 오디오 컨텍스트 차단 예외 처리
    }
  }

  /**
   * 구슬 골인 효과음 재생.
   */
  public playGoal(): void {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const startTime = now + idx * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });
    } catch {
      // 오디오 컨텍스트 차단 예외 처리
    }
  }

  /**
   * 스킬 발동 효과음 재생.
   */
  public playSkill(): void {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // 오디오 컨텍스트 차단 예외 처리
    }
  }

  /**
   * 최종 당첨 및 축하 효과음 재생.
   */
  public playVictory(): void {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Arpeggio + Chord
      const notes = [
        { freq: 523.25, time: 0 }, // C5
        { freq: 659.25, time: 0.1 }, // E5
        { freq: 783.99, time: 0.2 }, // G5
        { freq: 1046.5, time: 0.3 }, // C6
        { freq: 1318.51, time: 0.4 }, // E6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const startTime = now + note.time;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch {
      // 오디오 컨텍스트 차단 예외 처리
    }
  }
}

export const soundManager = new SoundManager();
