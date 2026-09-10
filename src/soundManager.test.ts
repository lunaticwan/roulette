import { describe, expect, it } from 'vitest';
import { SoundManager } from './soundManager';

describe('SoundManager', () => {
  it('should initialize with option value', () => {
    const sm = new SoundManager();
    expect(sm.isEnabled()).toBe(true);
  });

  it('should enable and disable sound correctly', () => {
    const sm = new SoundManager();
    sm.setEnabled(false);
    expect(sm.isEnabled()).toBe(false);

    sm.setEnabled(true);
    expect(sm.isEnabled()).toBe(true);
  });

  it('should execute sound methods without crashing', () => {
    const sm = new SoundManager();
    expect(() => {
      sm.playBounce(0.8);
      sm.playGoal();
      sm.playSkill();
      sm.playVictory();
    }).not.toThrow();
  });
});
