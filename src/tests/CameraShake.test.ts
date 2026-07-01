import { describe, it, expect } from 'vitest';
import { CameraShake } from '../engine/camera/CameraShake';

describe('CameraShake', () => {
  it('should start quiet with no intensity', () => {
    const shake = new CameraShake();
    expect(shake.isShaking).toBe(false);
    const offset = shake.getOffset(0.016);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
    expect(offset.z).toBe(0);
  });

  it('should start shaking after trigger', () => {
    const shake = new CameraShake();
    shake.trigger(0.5);
    expect(shake.isShaking).toBe(true);
    const offset = shake.getOffset(0.016);
    // At intensity 0.5, max displacement is 0.25 units
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.25);
    expect(Math.abs(offset.y)).toBeLessThanOrEqual(0.25);
    expect(Math.abs(offset.z)).toBeLessThanOrEqual(0.25);
    // At least one axis should be non-zero (random)
    expect(offset.x !== 0 || offset.y !== 0 || offset.z !== 0).toBe(true);
  });

  it('should decay over time', () => {
    const shake = new CameraShake();
    shake.setDecayRate(1.0);
    shake.trigger(1.0);

    // After 0.5s at decay 1.0: intensity = 1.0 - 0.5 = 0.5
    shake.getOffset(0.5);
    expect(shake.isShaking).toBe(true);

    // After another 0.5s: intensity drops from 0.5 to 0.0.
    // getOffset returns one final shake frame (before decay applies), but isShaking is false after.
    shake.getOffset(0.5);
    expect(shake.isShaking).toBe(false);

    // Third call with zero intensity returns zero vector
    const finalOffset = shake.getOffset(0.016);
    expect(finalOffset.x).toBe(0);
    expect(finalOffset.y).toBe(0);
    expect(finalOffset.z).toBe(0);
  });

  it('should decay faster with higher decay rate', () => {
    const shake = new CameraShake();
    shake.setDecayRate(10.0);
    shake.trigger(0.8);

    // After 0.1s at decay 10: intensity = 0.8 - 1.0 = 0 (clamped)
    shake.getOffset(0.1);
    expect(shake.isShaking).toBe(false);
  });

  it('should clear immediately', () => {
    const shake = new CameraShake();
    shake.trigger(0.8);
    expect(shake.isShaking).toBe(true);
    shake.clear();
    expect(shake.isShaking).toBe(false);
    const offset = shake.getOffset(0.016);
    expect(offset.x).toBe(0);
  });

  it('should use highest intensity when triggered multiple times', () => {
    const shake = new CameraShake();
    shake.trigger(0.3);
    shake.trigger(0.9); // higher
    const offset = shake.getOffset(0.016);
    // At intensity 0.9, max displacement is 0.45
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.45);
    // Should still be kicking after just one frame
    expect(shake.isShaking).toBe(true);
  });

  it('should not exceed max intensity 1.0', () => {
    const shake = new CameraShake();
    shake.trigger(2.0);
    shake.trigger(100);
    const offset = shake.getOffset(0.016);
    // At clamped intensity 1.0, max displacement is 0.5
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(offset.y)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(offset.z)).toBeLessThanOrEqual(0.5);
  });

  it('should not re-trigger with lower intensity than current', () => {
    const shake = new CameraShake();
    shake.trigger(0.8);
    shake.trigger(0.3); // lower, should be ignored
    // intensity should still be 0.8
    const offset = shake.getOffset(0.016);
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.4);
  });
});