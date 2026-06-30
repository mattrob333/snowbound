import { describe, it, expect } from 'vitest';
import { MonsterDistanceModel } from '../gameplay/monster/MonsterDistanceModel';

describe('MonsterDistanceModel', () => {
  const model = new MonsterDistanceModel(8, 1.5);
  const routeLength = 100;

  it('should report gap ≈ 0 when dog and player at same progress', () => {
    const result = model.evaluate(0.5, 0.5, routeLength);
    expect(result.gap).toBeCloseTo(0);
    expect(result.close).toBe(true);
    expect(result.caught).toBe(true);
  });

  it('should report positive gap when dog behind player', () => {
    const result = model.evaluate(0.3, 0.5, routeLength);
    expect(result.gap).toBeCloseTo(20); // (0.5 - 0.3) * 100
    expect(result.close).toBe(false);
    expect(result.caught).toBe(false);
  });

  it('should report negative gap when dog ahead of player', () => {
    const result = model.evaluate(0.7, 0.4, routeLength);
    expect(result.gap).toBeCloseTo(-30); // (0.4 - 0.7) * 100
    expect(result.close).toBe(false);
    expect(result.caught).toBe(false);
  });

  it('should trigger close warning when gap ≤ closeThreshold', () => {
    // 7 units gap < 8 threshold
    const result = model.evaluate(0.43, 0.5, routeLength);
    expect(result.gap).toBeCloseTo(7);
    expect(result.close).toBe(true);
    expect(result.caught).toBe(false); // 7 > 1.5
  });

  it('should trigger caught when gap ≤ catchThreshold', () => {
    // 1 unit gap < 1.5 threshold
    const result = model.evaluate(0.49, 0.5, routeLength);
    expect(result.close).toBe(true);
    expect(result.caught).toBe(true);
  });

  it('should work with very short routes', () => {
    const shortRoute = 5;
    const result = model.evaluate(0.1, 0.5, shortRoute);
    expect(result.gap).toBeCloseTo(2); // (0.5 - 0.1) * 5
    expect(result.close).toBe(true);   // 2 <= 8
    expect(result.caught).toBe(false);  // 2 > 1.5
  });

  it('should work with zero route length (edge case)', () => {
    const result = model.evaluate(0.5, 0.5, 0);
    expect(result.gap).toBeCloseTo(0);
    expect(result.close).toBe(true);
    expect(result.caught).toBe(true);
  });

  it('should respect custom thresholds', () => {
    const custom = new MonsterDistanceModel(15, 3);
    // 10 units gap — within close (15) but outside catch (3)
    const result = custom.evaluate(0.4, 0.5, 100);
    expect(result.gap).toBeCloseTo(10);
    expect(result.close).toBe(true);
    expect(result.caught).toBe(false);
  });
});