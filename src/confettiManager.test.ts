import { describe, expect, it, vi } from 'vitest';
import { ConfettiManager } from './confettiManager';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('ConfettiManager', () => {
  it('should trigger goal burst without throwing', () => {
    const cm = new ConfettiManager();
    expect(() => cm.triggerGoalBurst(0.5, 0.5)).not.toThrow();
  });

  it('should trigger victory shower without throwing', () => {
    const cm = new ConfettiManager();
    expect(() => cm.triggerVictoryShower()).not.toThrow();
  });
});
