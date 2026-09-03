import { describe, expect, it } from 'vitest';
import { pad, parseName, rad, shuffle } from './utils';

describe('utils', () => {
  describe('rad', () => {
    it('converts degrees to radians', () => {
      expect(rad(0)).toBe(0);
      expect(rad(180)).toBeCloseTo(Math.PI);
      expect(rad(360)).toBeCloseTo(Math.PI * 2);
    });
  });

  describe('parseName', () => {
    it('parses basic name without weight or count', () => {
      expect(parseName('Alice')).toEqual({
        name: 'Alice',
        weight: 1,
        count: 1,
      });
    });

    it('parses name with weight and count', () => {
      expect(parseName('Bob/3*5')).toEqual({
        name: 'Bob',
        weight: 3,
        count: 5,
      });
    });

    it('returns null for empty name string', () => {
      expect(parseName('')).toBeNull();
    });
  });

  describe('pad', () => {
    it('pads single digit numbers with leading zero', () => {
      expect(pad(5)).toBe('05');
      expect(pad(0)).toBe('00');
      expect(pad(12)).toBe('12');
    });
  });

  describe('shuffle', () => {
    it('returns array with same length and elements', () => {
      const array = [1, 2, 3, 4, 5];
      const result = shuffle(array);
      expect(result).toHaveLength(array.length);
      expect(result.sort()).toEqual(array.sort());
    });

    it('does not mutate original array', () => {
      const original = [1, 2, 3];
      const copy = [...original];
      shuffle(original);
      expect(original).toEqual(copy);
    });
  });
});
